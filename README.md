# mock-project-nodejs

Medium clone backend API ([RealWorld spec](https://realworld-docs.netlify.app/specifications/backend/endpoints/)) built with [NestJS](https://nestjs.com).

## Requirements

- Node.js >= 20 (see `.nvmrc`, run `nvm use`)
- npm

## Getting started

```bash
nvm use
npm install
cp .env.example .env
docker compose up -d
npm run migration:run
npm run start:dev
```

`docker compose up -d` starts PostgreSQL and Redis. Skip it if you already run them locally, and set the `DB_*` / `REDIS_*` values in `.env`.

Set `JWT_SECRET` in `.env` before starting (at least 32 characters), for example with `openssl rand -hex 32`. The app refuses to start while it is empty.

| Variable | Description |
| --- | --- |
| `JWT_SECRET` | Secret used to sign tokens (required, min 32 chars) |
| `JWT_EXPIRES_IN` | Token lifetime in seconds (default 604800) |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` | Redis connection used to store logged-out tokens |
| `REDIS_KEY_PREFIX` | Prefix for every Redis key (default `medium-clone:`), so a shared Redis is safe |
| `AUTH_RATE_LIMIT` | Max login/signup requests per minute per client (default 5; raise it when running the RealWorld API test suite) |
| `TRUST_PROXY_HOPS` | Number of reverse proxies in front of the app, so rate limiting uses the client IP (default 0) |

- API: http://localhost:3000/api
- Swagger docs: http://localhost:3000/api/docs

## Scripts

| Script | Description |
| --- | --- |
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled build |
| `npm run migration:generate -- src/database/migrations/<Name>` | Generate a migration from entity changes |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Revert the last migration |
| `npm run lint` | SunLint on `src/` |
| `npm run lint:changed` | SunLint on changed files |
| `npm run lint:security` | SunLint security rules |
| `npm run format` | Format with prettier |
| `npm test` | Unit tests (vitest) |
| `npm run test:e2e` | End-to-end tests against the `*_test` database from `.env.test` |

## Tests

`npm run test:e2e` loads `.env.test` on top of `.env`, creates the test database if missing and runs all migrations before the suite. It refuses to run unless `DB_DATABASE` ends with `_test`, so the development database is never touched.

## Project structure

```
src/
├── main.ts           # Bootstrap
├── setup-app.ts      # helmet, CORS, /api prefix, validation (422), error filter, swagger
├── app.module.ts     # Root module
├── config/           # Env config + Joi validation
├── common/filters/   # Errors as { "errors": { "body": [...] } }
├── database/         # TypeORM module, CLI data source, migrations
├── redis/            # Shared Redis client
└── modules/          # Feature modules with their entities
test/                 # e2e tests
```

## Database model

| Table | Description |
| --- | --- |
| `users` | email, username (unique), password, bio, image |
| `articles` | slug (unique), title, description, body, `author_id` -> users |
| `comments` | body, `author_id` -> users, `article_id` -> articles |
| `tags` | name (unique) |
| `article_tags` | articles <-> tags (many-to-many) |
| `article_favorites` | users <-> articles favorites (many-to-many) |
| `user_follows` | `follower_id` -> users, `following_id` -> users (self many-to-many) |
