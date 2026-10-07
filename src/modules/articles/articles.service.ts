import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BLANK_MESSAGE } from '../../common/constants/error-messages.constants.js';
import { apiErrors } from '../../common/errors/api-errors.js';
import type { Tag } from '../tags/entities/tag.entity.js';
import { TagsRepository } from '../tags/tags.repository.js';
import { FollowsRepository } from '../users/follows.repository.js';
import { ArticlesRepository } from './articles.repository.js';
import {
  ARTICLE_ERROR_FIELD,
  FORBIDDEN_MESSAGE,
  NOT_FOUND_MESSAGE,
} from './constants/article.constants.js';
import type { SingleArticleResponseDto } from './dto/article-response.dto.js';
import type { CreateArticleFieldsDto } from './dto/create-article.dto.js';
import type { UpdateArticleFieldsDto } from './dto/update-article.dto.js';
import type { Article } from './entities/article.entity.js';
import type { ArticleChanges } from './interfaces/article-changes.interface.js';
import { generateSlug } from './utils/slugify.js';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly tagsRepository: TagsRepository,
    private readonly followsRepository: FollowsRepository,
  ) {}

  async create(
    authorId: number,
    dto: CreateArticleFieldsDto,
  ): Promise<SingleArticleResponseDto> {
    const article = await this.articlesRepository.save({
      slug: generateSlug(dto.title),
      title: dto.title,
      description: dto.description,
      body: dto.body,
      author: { id: authorId },
      tags: await this.findOrCreateTags(dto.tagList ?? []),
    });
    return this.findBySlug(article.slug, authorId);
  }

  async findBySlug(
    slug: string,
    viewerId: number | null,
  ): Promise<SingleArticleResponseDto> {
    const article = await this.findArticle(slug);
    return this.toResponse(article, viewerId);
  }

  async update(
    slug: string,
    userId: number,
    dto: UpdateArticleFieldsDto,
  ): Promise<SingleArticleResponseDto> {
    const article = await this.findOwnArticle(slug, userId);

    const changes: ArticleChanges = {};
    if (dto.title !== undefined) {
      changes.title = dto.title;
    }
    if (dto.description !== undefined) {
      changes.description = dto.description;
    }
    if (dto.body !== undefined) {
      changes.body = dto.body;
    }
    if (Object.keys(changes).length === 0 && dto.tagList === undefined) {
      throw new UnprocessableEntityException(
        apiErrors({ [ARTICLE_ERROR_FIELD]: [BLANK_MESSAGE] }),
      );
    }

    const isUpdated = await this.articlesRepository.updateFields(
      article.id,
      changes,
    );
    if (!isUpdated) {
      throw this.articleNotFound();
    }

    if (dto.tagList !== undefined) {
      const oldTagIds = article.tags.map((tag) => tag.id);
      await this.articlesRepository.save({
        id: article.id,
        tags: await this.findOrCreateTags(dto.tagList),
      });
      await this.removeUnusedTags(oldTagIds);
    }

    return this.findBySlug(slug, userId);
  }

  async remove(slug: string, userId: number): Promise<void> {
    const article = await this.findOwnArticle(slug, userId);
    const tagIds = article.tags.map((tag) => tag.id);
    await this.articlesRepository.deleteById(article.id);
    await this.removeUnusedTags(tagIds);
  }

  private async removeUnusedTags(tagIds: number[]): Promise<void> {
    try {
      await this.tagsRepository.deleteUnusedByIds(tagIds);
    } catch (error: unknown) {
      Logger.warn(
        { message: 'Failed to remove unused tags', tagIds, error },
        ArticlesService.name,
      );
    }
  }

  private async findArticle(slug: string): Promise<Article> {
    const article = await this.articlesRepository.findBySlug(slug);
    if (!article) {
      throw this.articleNotFound();
    }
    return article;
  }

  private async findOwnArticle(slug: string, userId: number): Promise<Article> {
    const article = await this.findArticle(slug);
    if (article.author.id !== userId) {
      throw new ForbiddenException(
        apiErrors({ [ARTICLE_ERROR_FIELD]: [FORBIDDEN_MESSAGE] }),
      );
    }
    return article;
  }

  private articleNotFound(): NotFoundException {
    return new NotFoundException(
      apiErrors({ [ARTICLE_ERROR_FIELD]: [NOT_FOUND_MESSAGE] }),
    );
  }

  private async findOrCreateTags(tagList: string[]): Promise<Tag[]> {
    const names = [...new Set(tagList)];
    if (names.length === 0) {
      return [];
    }
    return this.tagsRepository.findOrCreateByNames(names);
  }

  private async toResponse(
    article: Article,
    viewerId: number | null,
  ): Promise<SingleArticleResponseDto> {
    const author = article.author;
    const favoritesCount = await this.articlesRepository.countFavorites(
      article.id,
    );

    let isFavorited = false;
    let isFollowing = false;
    if (viewerId !== null) {
      isFavorited = await this.articlesRepository.isFavoritedBy(
        article.id,
        viewerId,
      );
      isFollowing = await this.followsRepository.isFollowing(
        viewerId,
        author.id,
      );
    }

    return {
      article: {
        slug: article.slug,
        title: article.title,
        description: article.description,
        body: article.body,
        tagList: article.tags.map((tag) => tag.name).sort(),
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        favorited: isFavorited,
        favoritesCount,
        author: {
          username: author.username,
          bio: author.bio,
          image: author.image,
          following: isFollowing,
        },
      },
    };
  }
}
