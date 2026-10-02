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

Skip `docker compose up -d` if you already have a local PostgreSQL, and set the `DB_*` values in `.env`.

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
| `npm run test:e2e` | End-to-end tests |

## Project structure

```
src/
├── main.ts           # Bootstrap
├── setup-app.ts      # helmet, CORS, /api prefix, validation (422), error filter, swagger
├── app.module.ts     # Root module
├── config/           # Env config + Joi validation
├── common/filters/   # Errors as { "errors": { "body": [...] } }
├── database/         # TypeORM module, CLI data source, migrations
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
