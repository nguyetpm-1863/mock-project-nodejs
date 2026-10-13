import { Injectable } from '@nestjs/common';
import { ArticlesService } from '../articles/articles.service.js';
import type { SingleArticleResponseDto } from '../articles/dto/article-response.dto.js';
import { FavoritesRepository } from './favorites.repository.js';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly favoritesRepository: FavoritesRepository,
    private readonly articlesService: ArticlesService,
  ) {}

  async favorite(
    slug: string,
    userId: number,
  ): Promise<SingleArticleResponseDto> {
    const article = await this.articlesService.findArticle(slug);
    await this.favoritesRepository.add(article.id, userId);
    return this.articlesService.toResponse(article, userId);
  }

  async unfavorite(
    slug: string,
    userId: number,
  ): Promise<SingleArticleResponseDto> {
    const article = await this.articlesService.findArticle(slug);
    await this.favoritesRepository.remove(article.id, userId);
    return this.articlesService.toResponse(article, userId);
  }
}
