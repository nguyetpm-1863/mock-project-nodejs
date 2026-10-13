import { INestApplication } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource, In } from 'typeorm';
import { MISSING_MESSAGE } from './../src/common/constants/error-messages.constants.js';
import { NOT_FOUND_MESSAGE } from './../src/modules/articles/constants/article.constants.js';
import { User } from './../src/modules/users/entities/user.entity.js';
import { createTestApp } from './support/create-test-app.js';

const PASSWORD = 'secret123';

describe('Favorites (e2e)', () => {
  let app: INestApplication<App>;
  let slug: string;
  const uid = `${Date.now()}`;
  const users = {
    author: { username: `fav-a-${uid}`, email: `fav-a-${uid}@example.com` },
    reader: { username: `fav-b-${uid}`, email: `fav-b-${uid}@example.com` },
  };
  const tokens: Record<keyof typeof users, string> = { author: '', reader: '' };

  const server = () => request(app.getHttpServer());
  const auth = (who: keyof typeof users) => `Token ${tokens[who]}`;
  const favorite = (who: keyof typeof users, articleSlug = slug) =>
    server()
      .post(`/api/articles/${articleSlug}/favorite`)
      .set('Authorization', auth(who));
  const unfavorite = (who: keyof typeof users, articleSlug = slug) =>
    server()
      .delete(`/api/articles/${articleSlug}/favorite`)
      .set('Authorization', auth(who));

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
        article: { title: `Favorites ${uid}`, description: 'd', body: 'b' },
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

  it('favorites and unfavorites an article', async () => {
    await favorite('reader')
      .expect(200)
      .expect((res) =>
        expect(res.body.article).toMatchObject({
          slug,
          favorited: true,
          favoritesCount: 1,
          author: { username: users.author.username },
        }),
      );
    await favorite('author')
      .expect(200)
      .expect((res) =>
        expect(res.body.article).toMatchObject({
          favorited: true,
          favoritesCount: 2,
        }),
      );

    await server()
      .get(`/api/articles?favorited=${users.reader.username}`)
      .expect(200)
      .expect((res) =>
        expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
          slug,
        ]),
      );

    await unfavorite('reader')
      .expect(200)
      .expect((res) =>
        expect(res.body.article).toMatchObject({
          favorited: false,
          favoritesCount: 1,
        }),
      );
    await server()
      .get(`/api/articles/${slug}`)
      .set('Authorization', auth('reader'))
      .expect(200)
      .expect((res) =>
        expect(res.body.article).toMatchObject({
          favorited: false,
          favoritesCount: 1,
        }),
      );
    await unfavorite('author').expect(200);
  });

  it('keeps one favorite when favoriting twice', async () => {
    await favorite('reader').expect(200);
    await favorite('reader')
      .expect(200)
      .expect((res) => expect(res.body.article.favoritesCount).toBe(1));
    await unfavorite('reader').expect(200);
  });

  it('returns the article when unfavoriting an article not favorited', () =>
    unfavorite('reader')
      .expect(200)
      .expect((res) =>
        expect(res.body.article).toMatchObject({
          favorited: false,
          favoritesCount: 0,
        }),
      ));

  it.each(['post', 'delete'] as const)(
    'returns 401 token is missing for %s without token',
    (method) =>
      server()
        [method](`/api/articles/${slug}/favorite`)
        .expect(401)
        .expect((res) =>
          expect(res.body).toEqual({ errors: { token: [MISSING_MESSAGE] } }),
        ),
  );

  it.each([
    ['favorite', favorite],
    ['unfavorite', unfavorite],
  ])('returns 404 article not found on %s for an unknown slug', (_name, call) =>
    call('reader', `missing-${uid}`)
      .expect(404)
      .expect((res) =>
        expect(res.body).toEqual({
          errors: { article: [NOT_FOUND_MESSAGE] },
        }),
      ),
  );
});
