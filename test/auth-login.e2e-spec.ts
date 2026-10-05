import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import {
  DEFAULT_AUTH_RATE_LIMIT,
  TOO_MANY_REQUESTS_MESSAGE,
} from './../src/common/constants/app.constants.js';
import {
  BLANK_MESSAGE,
  INVALID_MESSAGE,
} from './../src/common/constants/error-messages.constants.js';
import { User } from './../src/modules/users/entities/user.entity.js';
import { createTestApp } from './support/create-test-app.js';

const PASSWORD = 'secret123';

const seedUser = (app: INestApplication<App>, suffix: string) => {
  const user = {
    email: `login-${suffix}-${Date.now()}@example.com`,
    username: `login-${suffix}-${Date.now()}`,
  };
  return app
    .get(DataSource)
    .getRepository(User)
    .save({ ...user, password: bcrypt.hashSync(PASSWORD, 4) })
    .then(() => user);
};

const removeUser = (app: INestApplication<App>, email: string) =>
  app.get(DataSource).getRepository(User).delete({ email });

describe('POST /api/users/login (e2e)', () => {
  let seedApp: INestApplication<App>;
  let app: INestApplication<App>;
  let email: string;
  let username: string;

  beforeAll(async () => {
    seedApp = await createTestApp();
    ({ email, username } = await seedUser(seedApp, 'ok'));
  });

  afterAll(async () => {
    await removeUser(seedApp, email);
    await seedApp.close();
  });

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns user and a valid token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/users/login')
      .send({ user: { email, password: PASSWORD } })
      .expect(200)
      .expect('Cache-Control', 'no-store, no-cache, must-revalidate')
      .expect('Pragma', 'no-cache')
      .expect('Expires', '0');

    expect(res.body.user).toMatchObject({ email, username, bio: null });
    const payload = await app
      .get(JwtService)
      .verifyAsync<{ username: string }>(res.body.user.token);
    expect(payload.username).toBe(username);
  });

  it('accepts email with different case and surrounding spaces', () => {
    return request(app.getHttpServer())
      .post('/api/users/login')
      .send({
        user: { email: `  ${email.toUpperCase()} `, password: PASSWORD },
      })
      .expect(200)
      .expect((res) => expect(res.body.user.email).toBe(email));
  });

  it.each([
    ['wrong password', () => ({ email, password: 'wrong-password' })],
    [
      'unknown email',
      () => ({ email: 'nobody@example.com', password: PASSWORD }),
    ],
  ])('returns 401 credentials invalid for %s', (_case, credentials) =>
    request(app.getHttpServer())
      .post('/api/users/login')
      .send({ user: credentials() })
      .expect(401)
      .expect((res) =>
        expect(res.body).toEqual({
          errors: { credentials: [INVALID_MESSAGE] },
        }),
      ),
  );

  it.each(['email', 'password'])(
    "returns 422 can't be blank for empty %s",
    (field) =>
      request(app.getHttpServer())
        .post('/api/users/login')
        .send({ user: { email, password: PASSWORD, [field]: '' } })
        .expect(422)
        .expect((res) =>
          expect(res.body.errors[field]).toEqual([BLANK_MESSAGE]),
        ),
  );

  it.each([
    [{ user: { email: 'not-an-email', password: PASSWORD } }, 'email'],
    [{ user: [] }, 'user'],
    [{ user: [{ email: 'jake@jake.jake', password: 'x' }] }, 'user'],
    [{}, 'user'],
  ])('returns 422 for invalid body %j', (body, field) =>
    request(app.getHttpServer())
      .post('/api/users/login')
      .send(body)
      .expect(422)
      .expect((res) =>
        expect(res.body.errors[field].length).toBeGreaterThan(0),
      ),
  );
});

describe('POST /api/users/login rate limit (e2e)', () => {
  let app: INestApplication<App>;
  let email: string;

  beforeAll(async () => {
    app = await createTestApp();
    ({ email } = await seedUser(app, 'limit'));
  });

  afterAll(async () => {
    await removeUser(app, email);
    await app.close();
  });

  it('returns 429 once the limit is exceeded', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/users/login')
        .send({ user: { email, password: 'wrong-password' } });

    for (let i = 0; i < DEFAULT_AUTH_RATE_LIMIT; i++) {
      await attempt().expect(401);
    }
    await attempt()
      .expect(429)
      .expect((res) =>
        expect(res.body.errors.body).toEqual([TOO_MANY_REQUESTS_MESSAGE]),
      );
  });
});
