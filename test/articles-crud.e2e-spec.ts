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
import { Tag } from './../src/modules/tags/entities/tag.entity.js';
import { User } from './../src/modules/users/entities/user.entity.js';
import { createTestApp } from './support/create-test-app.js';

const PASSWORD = 'secret123';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

describe('Articles CRUD (e2e)', () => {
  let app: INestApplication<App>;
  const uid = `${Date.now()}`;
  const tags = [`t_${uid}`, `d_${uid}`];
  const users = {
    author: { username: `art-a-${uid}`, email: `art-a-${uid}@example.com` },
    other: { username: `art-b-${uid}`, email: `art-b-${uid}@example.com` },
  };
  const tokens: Record<keyof typeof users, string> = { author: '', other: '' };

  const server = () => request(app.getHttpServer());
  const auth = (who: keyof typeof users) => `Token ${tokens[who]}`;
  const createArticle = (article: object, who: keyof typeof users = 'author') =>
    server()
      .post('/api/articles')
      .set('Authorization', auth(who))
      .send({ article });
  const validArticle = (title = `Article ${uid}`) => ({
    title,
    description: 'Test description',
    body: 'Test body content',
  });

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
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);
    await dataSource
      .getRepository(User)
      .delete({ email: In(Object.values(users).map((user) => user.email)) });
    await dataSource.getRepository(Tag).delete({ name: In(tags) });
    await app.close();
  });

  it('creates, reads, updates and deletes an article', async () => {
    const created = await createArticle({ ...validArticle(), tagList: tags })
      .expect(201)
      .then((res) => res.body.article);
    expect(created).toMatchObject({
      ...validArticle(),
      tagList: [...tags].sort(),
      favorited: false,
      favoritesCount: 0,
      author: { username: users.author.username, following: false },
    });
    expect(created.slug).toMatch(new RegExp(`^article-${uid}-[0-9a-f]{8}$`));
    expect(created.createdAt).toMatch(ISO_DATE);

    const fetched = await server()
      .get(`/api/articles/${created.slug}`)
      .expect(200);
    expect(fetched.body.article).toEqual(created);

    const updated = await server()
      .put(`/api/articles/${created.slug}`)
      .set('Authorization', auth('author'))
      .send({ article: { body: 'Updated body content' } })
      .expect(200)
      .then((res) => res.body.article);
    expect(updated).toMatchObject({
      slug: created.slug,
      body: 'Updated body content',
      tagList: [...tags].sort(),
      createdAt: created.createdAt,
    });
    expect(updated.updatedAt).not.toBe(created.updatedAt);

    await server()
      .put(`/api/articles/${created.slug}`)
      .set('Authorization', auth('author'))
      .send({ article: { tagList: [] } })
      .expect(200)
      .expect((res) => expect(res.body.article.tagList).toEqual([]));

    await server()
      .delete(`/api/articles/${created.slug}`)
      .set('Authorization', auth('author'))
      .expect(204);
    await server()
      .get(`/api/articles/${created.slug}`)
      .expect(404)
      .expect((res) =>
        expect(res.body).toEqual({ errors: { article: [NOT_FOUND_MESSAGE] } }),
      );
  });

  it('gives duplicate titles different slugs', async () => {
    const title = `Dup ${uid}`;
    const first = await createArticle(validArticle(title)).expect(201);
    const second = await createArticle(validArticle(title)).expect(201);
    expect(first.body.article.slug).not.toBe(second.body.article.slug);
  });

  it.each(['title', 'description', 'body'])(
    "returns 422 can't be blank for empty %s",
    (field) =>
      createArticle({ ...validArticle(), [field]: '' })
        .expect(422)
        .expect((res) =>
          expect(res.body.errors[field]).toEqual([BLANK_MESSAGE]),
        ),
  );

  it.each([
    ['tagList', { tagList: null }],
    ['tagList', { tagList: 'not-a-list' }],
    ['title', { title: '' }],
    ['article', {}],
  ])('rejects update of %s with %j', async (field, article) => {
    const { slug } = (await createArticle(validArticle()).expect(201)).body
      .article;

    await server()
      .put(`/api/articles/${slug}`)
      .set('Authorization', auth('author'))
      .send({ article })
      .expect(422)
      .expect((res) => expect(res.body.errors[field]).toBeDefined());
  });

  it.each([
    ['post', '/api/articles'],
    ['put', '/api/articles/some-slug'],
    ['delete', '/api/articles/some-slug'],
  ] as const)('returns 401 token is missing for %s %s', (method, url) =>
    server()
      [method](url)
      .send({ article: validArticle() })
      .expect(401)
      .expect((res) =>
        expect(res.body).toEqual({ errors: { token: [MISSING_MESSAGE] } }),
      ),
  );

  it.each(['put', 'delete'] as const)(
    'returns 404 for %s of an unknown slug',
    (method) =>
      server()
        [method](`/api/articles/unknown-${uid}`)
        .set('Authorization', auth('author'))
        .send({ article: { body: 'x' } })
        .expect(404)
        .expect((res) =>
          expect(res.body).toEqual({
            errors: { article: [NOT_FOUND_MESSAGE] },
          }),
        ),
  );

  it('returns 403 when another user updates or deletes the article', async () => {
    const { slug } = (await createArticle(validArticle()).expect(201)).body
      .article;
    const forbidden = { errors: { article: [FORBIDDEN_MESSAGE] } };

    await server()
      .put(`/api/articles/${slug}`)
      .set('Authorization', auth('other'))
      .send({ article: { body: 'hacked' } })
      .expect(403)
      .expect((res) => expect(res.body).toEqual(forbidden));
    await server()
      .delete(`/api/articles/${slug}`)
      .set('Authorization', auth('other'))
      .expect(403)
      .expect((res) => expect(res.body).toEqual(forbidden));
    await server().get(`/api/articles/${slug}`).expect(200);
  });

  it('shows favorited and following from the viewer perspective', async () => {
    const { slug } = (await createArticle(validArticle()).expect(201)).body
      .article;
    const dataSource = app.get(DataSource);
    const ids = await dataSource
      .getRepository(User)
      .findBy({ email: In([users.author.email, users.other.email]) });
    const authorId = ids.find((u) => u.email === users.author.email)?.id;
    const otherId = ids.find((u) => u.email === users.other.email)?.id;
    const articleId = (
      await dataSource.query('SELECT id FROM articles WHERE slug = $1', [slug])
    )[0].id;
    await dataSource.query(
      'INSERT INTO article_favorites (user_id, article_id) VALUES ($1, $2)',
      [otherId, articleId],
    );
    await dataSource.query(
      'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)',
      [otherId, authorId],
    );

    const asOther = await server()
      .get(`/api/articles/${slug}`)
      .set('Authorization', auth('other'))
      .expect(200);
    expect(asOther.body.article).toMatchObject({
      favorited: true,
      favoritesCount: 1,
      author: { following: true },
    });

    const anonymous = await server().get(`/api/articles/${slug}`).expect(200);
    expect(anonymous.body.article).toMatchObject({
      favorited: false,
      favoritesCount: 1,
      author: { following: false },
    });
  });

  it('bumps updatedAt when only tags change and removes unused tags', async () => {
    const solo = `solo_${uid}`;
    tags.push(solo);
    const created = (
      await createArticle({ ...validArticle(), tagList: [solo] }).expect(201)
    ).body.article;

    const updated = await server()
      .put(`/api/articles/${created.slug}`)
      .set('Authorization', auth('author'))
      .send({ article: { tagList: [] } })
      .expect(200)
      .then((res) => res.body.article);
    expect(updated.updatedAt).not.toBe(created.updatedAt);

    const remaining = await app
      .get(DataSource)
      .getRepository(Tag)
      .countBy({ name: solo });
    expect(remaining).toBe(0);
  });

  it('removes tags that no other article uses when an article is deleted', async () => {
    const shared = `shared_${uid}`;
    const lonely = `lonely_${uid}`;
    tags.push(shared, lonely);
    await createArticle({ ...validArticle(), tagList: [shared] }).expect(201);
    const { slug } = (
      await createArticle({
        ...validArticle(),
        tagList: [shared, lonely],
      }).expect(201)
    ).body.article;

    await server()
      .delete(`/api/articles/${slug}`)
      .set('Authorization', auth('author'))
      .expect(204);

    const names = (
      await app
        .get(DataSource)
        .getRepository(Tag)
        .findBy({ name: In([shared, lonely]) })
    ).map((tag) => tag.name);
    expect(names).toEqual([shared]);
  });

  it.each([
    ['tagList', { tagList: null }],
    ['body', { body: 'x'.repeat(50_001) }],
  ])('rejects create with invalid %s', (field, override) =>
    createArticle({ ...validArticle(), ...override })
      .expect(422)
      .expect((res) => expect(res.body.errors[field]).toBeDefined()),
  );
});
