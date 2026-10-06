import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource, In } from 'typeorm';
import {
  BLANK_MESSAGE,
  TAKEN_MESSAGE,
} from './../src/common/constants/error-messages.constants.js';
import { DEFAULT_AUTH_RATE_LIMIT } from './../src/common/constants/app.constants.js';
import { User } from './../src/modules/users/entities/user.entity.js';
import { createTestApp } from './support/create-test-app.js';

const PASSWORD = 'secret123';
const createdEmails: string[] = [];

const uniqueUser = (prefix: string) => {
  const id = `${prefix}-${Date.now()}-${createdEmails.length}`;
  const user = { username: id, email: `${id}@example.com`, password: PASSWORD };
  createdEmails.push(user.email);
  return user;
};

const signup = (app: INestApplication<App>, user: object) =>
  request(app.getHttpServer()).post('/api/users').send({ user });

describe('POST /api/users (e2e)', () => {
  let app: INestApplication<App>;

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

  it('creates the user and returns a valid token', async () => {
    const user = uniqueUser('signup');

    const res = await signup(app, user)
      .expect(201)
      .expect('Cache-Control', 'no-store, no-cache, must-revalidate');

    expect(res.body).toEqual({
      user: {
        email: user.email,
        token: expect.any(String),
        username: user.username,
        bio: null,
        image: null,
      },
    });
    const payload = await app
      .get(JwtService)
      .verifyAsync<Record<string, unknown>>(res.body.user.token);
    expect(payload).toMatchObject({
      sub: expect.any(Number),
      jti: expect.any(String),
    });
    expect(payload).not.toHaveProperty('username');
  });

  it('stores a normalized email and a hashed password', async () => {
    const user = uniqueUser('normalize');

    await signup(app, {
      ...user,
      email: `  ${user.email.toUpperCase()} `,
    }).expect(201);

    const stored = await app
      .get(DataSource)
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: user.email })
      .getOneOrFail();
    expect(await bcrypt.compare(PASSWORD, stored.password)).toBe(true);
  });

  it('returns 409 with the username field when username is taken', async () => {
    const user = uniqueUser('dupname');
    await signup(app, user).expect(201);

    await signup(app, { ...uniqueUser('other'), username: user.username })
      .expect(409)
      .expect((res) =>
        expect(res.body).toEqual({ errors: { username: [TAKEN_MESSAGE] } }),
      );
  });

  it('returns 409 with the email field when email is taken', async () => {
    const user = uniqueUser('dupmail');
    await signup(app, user).expect(201);

    await signup(app, {
      ...uniqueUser('other'),
      email: user.email.toUpperCase(),
    })
      .expect(409)
      .expect((res) =>
        expect(res.body).toEqual({ errors: { email: [TAKEN_MESSAGE] } }),
      );
  });

  it.each(['username', 'email', 'password'])(
    "returns 422 can't be blank for empty %s",
    (field) =>
      signup(app, { ...uniqueUser('blank'), [field]: '' })
        .expect(422)
        .expect((res) =>
          expect(res.body.errors[field]).toEqual([BLANK_MESSAGE]),
        ),
  );

  it.each([
    ['username', { username: 'jake smith' }],
    ['username', { username: 'jake/1' }],
    ['username', { username: 'nguyệt' }],
    ['username', { username: 'jake@home' }],
    ['email', { email: 'not-an-email' }],
    ['password', { password: 'short7c' }],
    ['password', { password: 'x'.repeat(73) }],
    ['password', { password: 'mậtkhẩu123' }],
  ])('returns 422 for invalid %s', (field, override) =>
    signup(app, { ...uniqueUser('invalid'), ...override })
      .expect(422)
      .expect((res) => expect(res.body.errors[field].length).toBe(1)),
  );

  it('accepts a username with letters, digits, underscores and hyphens', () =>
    signup(app, {
      ...uniqueUser('chars'),
      username: `Jake_Smith-${Date.now()}`,
    }).expect(201));

  it('accepts a 64 character password', () =>
    signup(app, { ...uniqueUser('long'), password: 'a'.repeat(64) }).expect(
      201,
    ));

  it.each([[{}], [{ user: [] }], [{ user: 'abc' }]])(
    'returns 422 for invalid body %j',
    (body) =>
      request(app.getHttpServer())
        .post('/api/users')
        .send(body)
        .expect(422)
        .expect((res) => expect(res.body.errors.user).toBeDefined()),
  );

  it('returns 429 once the signup limit is exceeded', async () => {
    const invalid = { username: '', email: 'bad', password: '' };
    for (let i = 0; i < DEFAULT_AUTH_RATE_LIMIT; i++) {
      await signup(app, invalid).expect(422);
    }
    await signup(app, invalid).expect(429);
  });
});
