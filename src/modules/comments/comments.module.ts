import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticlesRepository } from '../articles/articles.repository.js';
import { Article } from '../articles/entities/article.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { User } from '../users/entities/user.entity.js';
import { FollowsRepository } from '../users/follows.repository.js';
import { CommentsController } from './comments.controller.js';
import { CommentsRepository } from './comments.repository.js';
import { CommentsService } from './comments.service.js';
import { Comment } from './entities/comment.entity.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Comment, Article, User])],
  controllers: [CommentsController],
  providers: [
    CommentsService,
    CommentsRepository,
    ArticlesRepository,
    FollowsRepository,
  ],
})
export class CommentsModule {}
