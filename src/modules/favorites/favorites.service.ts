import { Injectable, NotFoundException } from '@nestjs/common';
import { apiErrors } from '../../common/errors/api-errors.js';
import { ArticlesRepository } from '../articles/articles.repository.js';
import { ArticlesService } from '../articles/articles.service.js';
import {
  ARTICLE_ERROR_FIELD,
  NOT_FOUND_MESSAGE,
} from '../articles/constants/article.constants.js';
import type { SingleArticleResponseDto } from '../articles/dto/article-response.dto.js';
import { FavoritesRepository } from './favorites.repository.js';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly favoritesRepository: FavoritesRepository,
    private readonly articlesRepository: ArticlesRepository,
    private readonly articlesService: ArticlesService,
  ) {}

  async favorite(
    slug: string,
    userId: number,
  ): Promise<SingleArticleResponseDto> {
    const articleId = await this.findArticleId(slug);
    await this.favoritesRepository.add(articleId, userId);
    return this.articlesService.findBySlug(slug, userId);
  }

  async unfavorite(
    slug: string,
    userId: number,
  ): Promise<SingleArticleResponseDto> {
    const articleId = await this.findArticleId(slug);
    await this.favoritesRepository.remove(articleId, userId);
    return this.articlesService.findBySlug(slug, userId);
  }

  private async findArticleId(slug: string): Promise<number> {
    const article = await this.articlesRepository.findBySlug(slug);
    if (!article) {
      throw new NotFoundException(
        apiErrors({ [ARTICLE_ERROR_FIELD]: [NOT_FOUND_MESSAGE] }),
      );
    }
    return article.id;
  }
}
