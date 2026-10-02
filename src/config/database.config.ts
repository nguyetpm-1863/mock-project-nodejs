import { registerAs } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';
import { Article } from '../modules/articles/entities/article.entity.js';
import { Comment } from '../modules/comments/entities/comment.entity.js';
import { Tag } from '../modules/tags/entities/tag.entity.js';
import { User } from '../modules/users/entities/user.entity.js';

export default registerAs(
  'database',
  (): DataSourceOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'medium_clone',
    logging: process.env.DB_LOGGING === 'true',
    entities: [User, Article, Comment, Tag],
    migrations: [`${import.meta.dirname}/../database/migrations/*.js`],
    synchronize: false,
  }),
);
