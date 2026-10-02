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
npm run start:dev
```

- API: http://localhost:3000/api
- Swagger docs: http://localhost:3000/api/docs

## Scripts

| Script | Description |
| --- | --- |
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled build |
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
└── modules/          # Feature modules
test/                 # e2e tests
```
