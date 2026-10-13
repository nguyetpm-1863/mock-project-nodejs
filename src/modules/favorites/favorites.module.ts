import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticlesRepository } from '../articles/articles.repository.js';
import { ArticlesModule } from '../articles/articles.module.js';
import { Article } from '../articles/entities/article.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { FavoritesController } from './favorites.controller.js';
import { FavoritesRepository } from './favorites.repository.js';
import { FavoritesService } from './favorites.service.js';

@Module({
  imports: [AuthModule, ArticlesModule, TypeOrmModule.forFeature([Article])],
  controllers: [FavoritesController],
  providers: [FavoritesService, FavoritesRepository, ArticlesRepository],
})
export class FavoritesModule {}
