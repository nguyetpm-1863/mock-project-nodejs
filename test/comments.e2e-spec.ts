import { INestApplication } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource, In } from 'typeorm';
import {
  BLANK_MESSAGE,
  MISSING_MESSAGE,
} from './../src/common/constants/error-messages.constants.js';
import {
  FORBIDDEN_MESSAGE,
  NOT_FOUND_MESSAGE,
} from './../src/modules/articles/constants/article.constants.js';
import { User } from './../src/modules/users/entities/user.entity.js';
import { createTestApp } from './support/create-test-app.js';

const PASSWORD = 'secret123';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

describe('Comments (e2e)', () => {
  let app: INestApplication<App>;
  let slug: string;
  const uid = `${Date.now()}`;
  const users = {
    author: { username: `cmt-a-${uid}`, email: `cmt-a-${uid}@example.com` },
    other: { username: `cmt-b-${uid}`, email: `cmt-b-${uid}@example.com` },
  };
  const tokens: Record<keyof typeof users, string> = { author: '', other: '' };

  const server = () => request(app.getHttpServer());
  const auth = (who: keyof typeof users) => `Token ${tokens[who]}`;
  const commentsUrl = (articleSlug = slug) =>
    `/api/articles/${articleSlug}/comments`;
  const addComment = (body: unknown, who: keyof typeof users = 'author') =>
    server()
      .post(commentsUrl())
      .set('Authorization', auth(who))
      .send({ comment: { body } });

  beforeAll(async () => {
    app = await createTestApp();
    const password = bcrypt.hashSync(PASSWORD, 4);
    await app
      .get(DataSource)
      .getRepository(User)
      .save(Object.values(users).map((user) => ({ ...user, password })));
    for (const who of Object.keys(users) as (keyof typeof users)[]) {
      const res = await server()
        .post('/api/users/login')
        .send({ user: { email: users[who].email, password: PASSWORD } })
        .expect(200);
      tokens[who] = res.body.user.token;
    }
    const article = await server()
      .post('/api/articles')
      .set('Authorization', auth('author'))
      .send({
        article: { title: `Comments ${uid}`, description: 'd', body: 'b' },
      })
      .expect(201);
    slug = article.body.article.slug;
  });

  afterAll(async () => {
    await app
      .get(DataSource)
      .getRepository(User)
      .delete({ email: In(Object.values(users).map((user) => user.email)) });
    await app.close();
  });

  it('creates, lists and deletes a comment', async () => {
    const created = await addComment('  Thank you so much!  ')
      .expect(201)
      .then((res) => res.body.comment);
    expect(created).toEqual({
      id: expect.any(Number),
      body: 'Thank you so much!',
      createdAt: expect.stringMatching(ISO_DATE),
      updatedAt: expect.stringMatching(ISO_DATE),
      author: {
        username: users.author.username,
        bio: null,
        image: null,
        following: false,
      },
    });

    const second = await addComment('Second', 'other')
      .expect(201)
      .then((res) => res.body.comment);

    await server()
      .get(commentsUrl())
      .expect(200)
      .expect((res) =>
        expect(res.body.comments.map((c: { id: number }) => c.id)).toEqual([
          second.id,
          created.id,
        ]),
      );

    await server()
      .delete(`${commentsUrl()}/${created.id}`)
      .set('Authorization', auth('author'))
      .expect(204);
    await server()
      .get(commentsUrl())
      .set('Authorization', auth('author'))
      .expect(200)
      .expect((res) => expect(res.body.comments).toEqual([second]));
  });

  it('returns 401 token is missing without a token', async () => {
    await server()
      .post(commentsUrl())
      .send({ comment: { body: 'x' } })
      .expect(401)
      .expect((res) =>
        expect(res.body).toEqual({ errors: { token: [MISSING_MESSAGE] } }),
      );
    await server()
      .delete(`${commentsUrl()}/1`)
      .expect(401)
      .expect((res) =>
        expect(res.body).toEqual({ errors: { token: [MISSING_MESSAGE] } }),
      );
  });

  it.each([[''], ['   '], [null]])(
    "returns 422 can't be blank for body %j",
    (body) =>
      addComment(body)
        .expect(422)
        .expect((res) => expect(res.body.errors.body).toEqual([BLANK_MESSAGE])),
  );

  it('returns 404 article not found for an unknown slug', async () => {
    const notFound = { errors: { article: [NOT_FOUND_MESSAGE] } };
    const missing = commentsUrl(`missing-${uid}`);
    await server()
      .get(missing)
      .expect(404)
      .expect((res) => expect(res.body).toEqual(notFound));
    await server()
      .post(missing)
      .set('Authorization', auth('author'))
      .send({ comment: { body: 'x' } })
      .expect(404)
      .expect((res) => expect(res.body).toEqual(notFound));
    await server()
      .delete(`${missing}/1`)
      .set('Authorization', auth('author'))
      .expect(404)
      .expect((res) => expect(res.body).toEqual(notFound));
  });

  it.each([['999999999'], ['99999999999'], ['abc'], ['1.5'], ['-1']])(
    'returns 404 comment not found for id %s',
    (id) =>
      server()
        .delete(`${commentsUrl()}/${id}`)
        .set('Authorization', auth('author'))
        .expect(404)
        .expect((res) =>
          expect(res.body).toEqual({
            errors: { comment: [NOT_FOUND_MESSAGE] },
          }),
        ),
  );

  it('forbids deleting a comment written by someone else', async () => {
    const comment = await addComment('Mine')
      .expect(201)
      .then((res) => res.body.comment);

    await server()
      .delete(`${commentsUrl()}/${comment.id}`)
      .set('Authorization', auth('other'))
      .expect(403)
      .expect((res) =>
        expect(res.body).toEqual({ errors: { comment: [FORBIDDEN_MESSAGE] } }),
      );
    await server()
      .get(commentsUrl())
      .expect((res) =>
        expect(res.body.comments.map((c: { id: number }) => c.id)).toContain(
          comment.id,
        ),
      );
  });
});
