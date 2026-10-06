import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Tag } from '../tags/entities/tag.entity.js';
import { TagsRepository } from '../tags/tags.repository.js';
import { FollowsRepository } from '../users/follows.repository.js';
import { User } from '../users/entities/user.entity.js';
import { ArticlesController } from './articles.controller.js';
import { ArticlesRepository } from './articles.repository.js';
import { ArticlesService } from './articles.service.js';
import { Article } from './entities/article.entity.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Article, Tag, User])],
  controllers: [ArticlesController],
  providers: [
    ArticlesService,
    ArticlesRepository,
    TagsRepository,
    FollowsRepository,
  ],
})
export class ArticlesModule {}
