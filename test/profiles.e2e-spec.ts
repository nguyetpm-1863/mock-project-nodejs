import { INestApplication } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource, In } from 'typeorm';
import { MISSING_MESSAGE } from './../src/common/constants/error-messages.constants.js';
import { NOT_FOUND_MESSAGE } from './../src/modules/articles/constants/article.constants.js';
import { FOLLOW_SELF_MESSAGE } from './../src/modules/profiles/constants/profile.constants.js';
import { User } from './../src/modules/users/entities/user.entity.js';
import { createTestApp } from './support/create-test-app.js';

const PASSWORD = 'secret123';

describe('Profiles (e2e)', () => {
  let app: INestApplication<App>;
  const uid = `${Date.now()}`;
  const users = {
    reader: { username: `prof-r-${uid}`, email: `prof-r-${uid}@example.com` },
    celeb: {
      username: `prof-c-${uid}`,
      email: `prof-c-${uid}@example.com`,
      bio: 'I write things',
    },
  };
  const tokens: Record<keyof typeof users, string> = { reader: '', celeb: '' };

  const server = () => request(app.getHttpServer());
  const auth = (who: keyof typeof users) => `Token ${tokens[who]}`;
  const profileUrl = (username = users.celeb.username) =>
    `/api/profiles/${username}`;
  const follow = (who: keyof typeof users, username?: string) =>
    server()
      .post(`${profileUrl(username)}/follow`)
      .set('Authorization', auth(who));
  const unfollow = (who: keyof typeof users, username?: string) =>
    server()
      .delete(`${profileUrl(username)}/follow`)
      .set('Authorization', auth(who));
  const celebProfile = (following: boolean) => ({
    profile: {
      username: users.celeb.username,
      bio: users.celeb.bio,
      image: null,
      following,
    },
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
    await app
      .get(DataSource)
      .getRepository(User)
      .delete({ email: In(Object.values(users).map((user) => user.email)) });
    await app.close();
  });

  it('gets a profile with and without a token', async () => {
    await server()
      .get(profileUrl())
      .expect(200)
      .expect((res) => expect(res.body).toEqual(celebProfile(false)));
    await server()
      .get(profileUrl())
      .set('Authorization', auth('reader'))
      .expect(200)
      .expect((res) => expect(res.body).toEqual(celebProfile(false)));
  });

  it('follows and unfollows a user, and the feed follows along', async () => {
    const article = await server()
      .post('/api/articles')
      .set('Authorization', auth('celeb'))
      .send({
        article: { title: `Profiles ${uid}`, description: 'd', body: 'b' },
      })
      .expect(201);
    const slug = article.body.article.slug;

    await follow('reader')
      .expect(200)
      .expect((res) => expect(res.body).toEqual(celebProfile(true)));
    await follow('reader')
      .expect(200)
      .expect((res) => expect(res.body).toEqual(celebProfile(true)));
    await server()
      .get(profileUrl())
      .set('Authorization', auth('reader'))
      .expect((res) => expect(res.body.profile.following).toBe(true));
    await server()
      .get('/api/articles/feed')
      .set('Authorization', auth('reader'))
      .expect(200)
      .expect((res) => {
        expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
          slug,
        ]);
        expect(res.body.articles[0].author.following).toBe(true);
      });

    await unfollow('reader')
      .expect(200)
      .expect((res) => expect(res.body).toEqual(celebProfile(false)));
    await server()
      .get('/api/articles/feed')
      .set('Authorization', auth('reader'))
      .expect(200)
      .expect((res) => expect(res.body.articlesCount).toBe(0));
  });

  it('returns your own profile with following false', () =>
    server()
      .get(profileUrl())
      .set('Authorization', auth('celeb'))
      .expect(200)
      .expect((res) => expect(res.body).toEqual(celebProfile(false))));

  it('returns 200 when unfollowing a user not followed', () =>
    unfollow('reader')
      .expect(200)
      .expect((res) => expect(res.body).toEqual(celebProfile(false))));

  it('returns 422 when following yourself', () =>
    follow('celeb')
      .expect(422)
      .expect((res) =>
        expect(res.body).toEqual({
          errors: { profile: [FOLLOW_SELF_MESSAGE] },
        }),
      ));

  it.each(['post', 'delete'] as const)(
    'returns 401 token is missing for %s follow without token',
    (method) =>
      server()
        [method](`${profileUrl()}/follow`)
        .expect(401)
        .expect((res) =>
          expect(res.body).toEqual({ errors: { token: [MISSING_MESSAGE] } }),
        ),
  );

  it('returns 404 profile not found for an unknown username', async () => {
    const notFound = { errors: { profile: [NOT_FOUND_MESSAGE] } };
    const missing = `missing-${uid}`;
    await server()
      .get(profileUrl(missing))
      .expect(404)
      .expect((res) => expect(res.body).toEqual(notFound));
    await follow('reader', missing)
      .expect(404)
      .expect((res) => expect(res.body).toEqual(notFound));
    await unfollow('reader', missing)
      .expect(404)
      .expect((res) => expect(res.body).toEqual(notFound));
  });
});
