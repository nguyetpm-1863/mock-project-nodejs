import { INestApplication } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource, In } from 'typeorm';
import { MISSING_MESSAGE } from './../src/common/constants/error-messages.constants.js';
import { Tag } from './../src/modules/tags/entities/tag.entity.js';
import { User } from './../src/modules/users/entities/user.entity.js';
import { createTestApp } from './support/create-test-app.js';

const PASSWORD = 'secret123';

describe('Articles list and feed (e2e)', () => {
  let app: INestApplication<App>;
  const uid = `${Date.now()}`;
  const tag = `list_${uid}`;
  const names = {
    writer: `list-w-${uid}`,
    reader: `list-r-${uid}`,
    other: `list-o-${uid}`,
  };
  const tokens: Record<string, string> = {};
  const ids: Record<string, number> = {};
  const slugs: string[] = [];

  const server = () => request(app.getHttpServer());
  const sql = (query: string, params: unknown[]) =>
    app.get(DataSource).query(query, params);

  beforeAll(async () => {
    app = await createTestApp();
    const password = bcrypt.hashSync(PASSWORD, 4);
    const users = await app
      .get(DataSource)
      .getRepository(User)
      .save(
        Object.values(names).map((username) => ({
          username,
          email: `${username}@example.com`,
          password,
        })),
      );
    for (const [role, username] of Object.entries(names)) {
      ids[role] = users.find((user) => user.username === username)?.id ?? 0;
      const res = await server()
        .post('/api/users/login')
        .send({
          user: { email: `${username}@example.com`, password: PASSWORD },
        })
        .expect(200);
      tokens[role] = res.body.user.token;
    }

    for (const index of [1, 2, 3]) {
      const res = await server()
        .post('/api/articles')
        .set('Authorization', `Token ${tokens.writer}`)
        .send({
          article: {
            title: `List ${index} ${uid}`,
            description: `Description ${index}`,
            body: `Body ${index}`,
            tagList: index === 2 ? [tag] : [],
          },
        })
        .expect(201);
      slugs.push(res.body.article.slug);
    }
    await server()
      .post('/api/articles')
      .set('Authorization', `Token ${tokens.other}`)
      .send({ article: { title: `Other ${uid}`, description: 'd', body: 'b' } })
      .expect(201);
  });

  afterAll(async () => {
    await app
      .get(DataSource)
      .getRepository(User)
      .delete({ username: In(Object.values(names)) });
    await app.get(DataSource).getRepository(Tag).delete({ name: tag });
    await app.close();
  });

  it('lists articles of an author, most recent first, without body', async () => {
    const res = await server()
      .get(`/api/articles?author=${names.writer}`)
      .expect(200);

    expect(res.body.articlesCount).toBe(3);
    expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual(
      [...slugs].reverse(),
    );
    expect(res.body.articles[0]).not.toHaveProperty('body');
    expect(res.body.articles[0]).toMatchObject({
      favorited: false,
      favoritesCount: 0,
      author: { username: names.writer, following: false },
    });
  });

  it('paginates with limit and offset while keeping the total count', async () => {
    const first = await server()
      .get(`/api/articles?author=${names.writer}&limit=1`)
      .expect(200);
    const second = await server()
      .get(`/api/articles?author=${names.writer}&limit=1&offset=1`)
      .expect(200);

    expect(first.body).toMatchObject({ articlesCount: 3 });
    expect(first.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
      slugs[2],
    ]);
    expect(second.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
      slugs[1],
    ]);
  });

  it('filters by tag and returns the full tag list', async () => {
    const res = await server().get(`/api/articles?tag=${tag}`).expect(200);

    expect(res.body.articlesCount).toBe(1);
    expect(res.body.articles[0]).toMatchObject({
      slug: slugs[1],
      tagList: [tag],
    });
  });

  it('filters by the user who favorited and shows viewer state', async () => {
    const articleId = (
      await sql('SELECT id FROM articles WHERE slug = $1', [slugs[0]])
    )[0].id;
    await sql(
      'INSERT INTO article_favorites (user_id, article_id) VALUES ($1, $2)',
      [ids.reader, articleId],
    );

    const res = await server()
      .get(`/api/articles?favorited=${names.reader}`)
      .set('Authorization', `Token ${tokens.reader}`)
      .expect(200);

    expect(res.body.articlesCount).toBe(1);
    expect(res.body.articles[0]).toMatchObject({
      slug: slugs[0],
      favorited: true,
      favoritesCount: 1,
    });
  });

  it('returns an empty feed until the reader follows someone', async () => {
    await server()
      .get('/api/articles/feed')
      .set('Authorization', `Token ${tokens.reader}`)
      .expect(200)
      .expect((res) =>
        expect(res.body).toEqual({ articles: [], articlesCount: 0 }),
      );

    await sql(
      'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)',
      [ids.reader, ids.writer],
    );

    const res = await server()
      .get('/api/articles/feed?limit=2')
      .set('Authorization', `Token ${tokens.reader}`)
      .expect(200);
    expect(res.body.articlesCount).toBe(3);
    expect(res.body.articles).toHaveLength(2);
    expect(res.body.articles[0]).not.toHaveProperty('body');
    expect(res.body.articles[0].author).toMatchObject({
      username: names.writer,
      following: true,
    });
  });

  it('requires a token for the feed', () =>
    server()
      .get('/api/articles/feed')
      .expect(401)
      .expect((res) =>
        expect(res.body).toEqual({ errors: { token: [MISSING_MESSAGE] } }),
      ));

  it.each(['limit=0', 'limit=101', 'limit=abc', 'offset=-1'])(
    'rejects invalid pagination %s',
    (query) =>
      server()
        .get(`/api/articles?${query}`)
        .expect(422)
        .expect((res) =>
          expect(Object.keys(res.body.errors)).toEqual([query.split('=')[0]]),
        ),
  );

  it('ignores empty filters', () =>
    server()
      .get(`/api/articles?author=${names.writer}&tag=&favorited=`)
      .expect(200)
      .expect((res) => expect(res.body.articlesCount).toBe(3)));

  it('marks the list response as not cacheable', () =>
    server()
      .get('/api/articles')
      .expect(200)
      .expect('Cache-Control', 'no-store, no-cache, must-revalidate'));
});
