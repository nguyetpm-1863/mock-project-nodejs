import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource, In } from 'typeorm';
import {
  BLANK_MESSAGE,
  INVALID_TOKEN_MESSAGE,
  MISSING_MESSAGE,
  TAKEN_MESSAGE,
} from './../src/common/constants/error-messages.constants.js';
import { MILLISECONDS_PER_SECOND } from './../src/modules/auth/constants/auth.constants.js';
import { User } from './../src/modules/users/entities/user.entity.js';
import { createTestApp } from './support/create-test-app.js';

const PASSWORD = 'secret123';

interface SeededUser {
  email: string;
  username: string;
  token: string;
}

describe('GET and PUT /api/user (e2e)', () => {
  let app: INestApplication<App>;
  const createdEmails: string[] = [];

  const seedUser = async (prefix: string): Promise<SeededUser> => {
    const id = `${prefix}-${Date.now()}-${createdEmails.length}`;
    const email = `${id}@example.com`;
    createdEmails.push(email, `${id}-upd@example.com`);
    await app
      .get(DataSource)
      .getRepository(User)
      .save({ email, username: id, password: bcrypt.hashSync(PASSWORD, 4) });
    const res = await request(app.getHttpServer())
      .post('/api/users/login')
      .send({ user: { email, password: PASSWORD } })
      .expect(200);
    return { email, username: id, token: res.body.user.token };
  };

  const getUser = (token: string) =>
    request(app.getHttpServer())
      .get('/api/user')
      .set('Authorization', `Token ${token}`);

  const putUser = (token: string, user: object) =>
    request(app.getHttpServer())
      .put('/api/user')
      .set('Authorization', `Token ${token}`)
      .send({ user });

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    const cleanupApp = await createTestApp();
    await cleanupApp
      .get(DataSource)
      .getRepository(User)
      .delete({ email: In(createdEmails) });
    await cleanupApp.close();
  });

  it('returns the current user with the presented token', async () => {
    const { token, email, username } = await seedUser('get');

    const res = await getUser(token).expect(200);
    expect(res.body).toEqual({
      user: { email, username, bio: null, image: null, token },
    });
  });

  it.each(['get', 'put'] as const)(
    'returns 401 token is missing for %s without token',
    (method) =>
      request(app.getHttpServer())
        [method]('/api/user')
        .send({ user: { bio: 'x' } })
        .expect(401)
        .expect((res) =>
          expect(res.body).toEqual({ errors: { token: [MISSING_MESSAGE] } }),
        ),
  );

  it('updates bio and image, normalizing empty strings to null', async () => {
    const { token } = await seedUser('profile');

    await putUser(token, { bio: 'Updated bio' })
      .expect(200)
      .expect((res) =>
        expect(res.body.user).toMatchObject({ bio: 'Updated bio', token }),
      );
    await putUser(token, { bio: '' })
      .expect(200)
      .expect((res) => expect(res.body.user.bio).toBeNull());
    await putUser(token, { image: 'https://example.com/photo.jpg' })
      .expect(200)
      .expect((res) =>
        expect(res.body.user.image).toBe('https://example.com/photo.jpg'),
      );
    await putUser(token, { image: null })
      .expect(200)
      .expect((res) => expect(res.body.user.image).toBeNull());

    const res = await getUser(token).expect(200);
    expect(res.body.user).toMatchObject({ bio: null, image: null });
  });

  it.each([
    ['email', { email: '' }],
    ['email', { email: null }],
    ['username', { username: '' }],
    ['username', { username: null }],
    ['password', { password: '' }],
    ['password', { password: null }],
    ['user', {}],
  ])("returns 422 can't be blank for %s %j", async (field, user) => {
    const { token } = await seedUser('blank');

    await putUser(token, user)
      .expect(422)
      .expect((res) => expect(res.body.errors[field]).toEqual([BLANK_MESSAGE]));
  });

  it.each([
    ['password', { password: 'short7c' }],
    ['email', { email: 'not-an-email' }],
    ['username', { username: 'bad name' }],
    ['image', { image: 'not-a-url' }],
    ['image', { image: 'ftp://example.com/a.png' }],
    ['bio', { bio: 'x'.repeat(1001) }],
  ])('returns 422 for invalid %s %j', async (field, user) => {
    const { token } = await seedUser('invalid');

    await putUser(token, user)
      .expect(422)
      .expect((res) => expect(res.body.errors[field]).toHaveLength(1));
  });

  it.each([['bonjour1'], ['a'.repeat(64)]])(
    'changes password %s, keeping this session and revoking older ones',
    async (password) => {
      const { token, email } = await seedUser('password');
      const { sub } = app.get(JwtService).decode<{ sub: number }>(token);
      const olderSession = await app.get(JwtService).signAsync(
        {
          sub,
          iat: Math.floor(Date.now() / MILLISECONDS_PER_SECOND) - 60,
        },
        { jwtid: randomUUID() },
      );
      await getUser(olderSession).expect(200);

      await putUser(token, { password })
        .expect(200)
        .expect((res) => expect(res.body.user.token).toBe(token));

      await getUser(token).expect(200);
      await getUser(olderSession)
        .expect(401)
        .expect((res) =>
          expect(res.body).toEqual({
            errors: { token: [INVALID_TOKEN_MESSAGE] },
          }),
        );
      await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ user: { email, password } })
        .expect(200);
    },
  );

  it('returns 409 when email or username belongs to another user', async () => {
    const owner = await seedUser('owner');
    const other = await seedUser('other');

    await putUser(owner.token, {
      email: other.email.toUpperCase(),
      username: other.username,
    })
      .expect(409)
      .expect((res) =>
        expect(res.body).toEqual({
          errors: { email: [TAKEN_MESSAGE], username: [TAKEN_MESSAGE] },
        }),
      );
  });

  it('keeps own email and username without conflict', async () => {
    const { token, email, username } = await seedUser('same');

    await putUser(token, { email, username }).expect(200);
  });

  it('updates username and email while the token stays valid', async () => {
    const { token, username } = await seedUser('rename');
    const updated = {
      username: `${username}-upd`,
      email: `${username}-upd@example.com`,
    };

    const res = await putUser(token, updated).expect(200);
    expect(res.body.user).toMatchObject({ ...updated, token });

    const current = await getUser(token).expect(200);
    expect(current.body.user).toMatchObject(updated);
  });
});
