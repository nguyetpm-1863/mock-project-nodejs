import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import {
  INVALID_TOKEN_MESSAGE,
  MISSING_MESSAGE,
} from './../src/common/constants/error-messages.constants.js';
import { User } from './../src/modules/users/entities/user.entity.js';
import { createTestApp } from './support/create-test-app.js';

const PASSWORD = 'secret123';

describe('POST /api/user/logout (e2e)', () => {
  let app: INestApplication<App>;
  const id = `logout-${Date.now()}`;
  const credentials = { email: `${id}@example.com`, password: PASSWORD };

  const login = () =>
    request(app.getHttpServer())
      .post('/api/users/login')
      .send({ user: credentials })
      .expect(200)
      .then((res) => res.body.user.token as string);

  const logout = (authorization?: string) => {
    const req = request(app.getHttpServer()).post('/api/user/logout');
    return authorization ? req.set('Authorization', authorization) : req;
  };

  beforeAll(async () => {
    app = await createTestApp();
    await request(app.getHttpServer())
      .post('/api/users')
      .send({ user: { ...credentials, username: id } })
      .expect(201);
  });

  afterAll(async () => {
    await app
      .get(DataSource)
      .getRepository(User)
      .delete({ email: credentials.email });
    await app.close();
  });

  it('revokes the token so it cannot be used again', async () => {
    const token = await login();

    await logout(`Token ${token}`).expect(204);
    await logout(`Token ${token}`)
      .expect(401)
      .expect((res) =>
        expect(res.body).toEqual({
          errors: { token: [INVALID_TOKEN_MESSAGE] },
        }),
      );
  });

  it('keeps other sessions of the same user valid', async () => {
    const first = await login();
    const second = await login();

    await logout(`Token ${first}`).expect(204);
    await logout(`Token ${second}`).expect(204);
  });

  it.each([undefined, 'Bearer abc', 'Token'])(
    'returns 401 token is missing for header %s',
    (header) =>
      logout(header)
        .expect(401)
        .expect((res) =>
          expect(res.body).toEqual({ errors: { token: [MISSING_MESSAGE] } }),
        ),
  );

  it('returns 401 token is invalid for a malformed token', () =>
    logout('Token not-a-jwt')
      .expect(401)
      .expect((res) =>
        expect(res.body).toEqual({
          errors: { token: [INVALID_TOKEN_MESSAGE] },
        }),
      ));
});
