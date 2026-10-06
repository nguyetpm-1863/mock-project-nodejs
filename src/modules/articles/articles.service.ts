import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
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
import type {
  ListArticlesQueryDto,
  PaginationQueryDto,
} from './dto/list-articles-query.dto.js';
import type { MultipleArticlesResponseDto } from './dto/multiple-articles-response.dto.js';
import type { UpdateArticleFieldsDto } from './dto/update-article.dto.js';
import type { Article } from './entities/article.entity.js';
import type { ArticleChanges } from './interfaces/article-changes.interface.js';
import type { ArticleFilters } from './interfaces/article-filters.interface.js';
import { generateSlug } from './utils/slugify.js';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly tagsRepository: TagsRepository,
    private readonly followsRepository: FollowsRepository,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    authorId: number,
    dto: CreateArticleFieldsDto,
  ): Promise<SingleArticleResponseDto> {
    const slug = generateSlug(dto.title);
    await this.dataSource.transaction(async (manager) => {
      const tags = await this.findOrCreateTags(dto.tagList ?? [], manager);
      await this.articlesRepository.save(
        {
          slug,
          title: dto.title,
          description: dto.description,
          body: dto.body,
          author: { id: authorId },
          tags,
        },
        manager,
      );
    });
    return this.findBySlug(slug, authorId);
  }

  list(
    query: ListArticlesQueryDto,
    viewerId: number | null,
  ): Promise<MultipleArticlesResponseDto> {
    return this.findPage(
      {
        tag: query.tag,
        author: query.author,
        favorited: query.favorited,
        limit: query.limit,
        offset: query.offset,
      },
      viewerId,
    );
  }

  feed(
    query: PaginationQueryDto,
    viewerId: number,
  ): Promise<MultipleArticlesResponseDto> {
    return this.findPage(
      { followedBy: viewerId, limit: query.limit, offset: query.offset },
      viewerId,
    );
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

    const oldTagIds = article.tags.map((tag) => tag.id);
    const isUpdated = await this.dataSource.transaction(async (manager) => {
      const isRowUpdated = await this.articlesRepository.updateFields(
        article.id,
        changes,
        manager,
      );
      if (isRowUpdated && dto.tagList !== undefined) {
        await this.articlesRepository.save(
          {
            id: article.id,
            tags: await this.findOrCreateTags(dto.tagList, manager),
          },
          manager,
        );
        await this.tagsRepository.deleteUnusedByIds(oldTagIds, manager);
      }
      return isRowUpdated;
    });
    if (!isUpdated) {
      throw this.articleNotFound();
    }

    return this.findBySlug(slug, userId);
  }

  async remove(slug: string, userId: number): Promise<void> {
    const article = await this.findOwnArticle(slug, userId);
    const tagIds = article.tags.map((tag) => tag.id);

    await this.dataSource.transaction(async (manager) => {
      await this.articlesRepository.deleteById(article.id, manager);
      await this.tagsRepository.deleteUnusedByIds(tagIds, manager);
    });
  }

  private async findPage(
    filters: ArticleFilters,
    viewerId: number | null,
  ): Promise<MultipleArticlesResponseDto> {
    const [articles, articlesCount] =
      await this.articlesRepository.findPage(filters);
    if (articles.length === 0) {
      return { articles: [], articlesCount };
    }

    const articleIds = articles.map((article) => article.id);
    const authorIds = articles.map((article) => article.author.id);
    const [favoritesCounts, favoritedIds, followedIds] = await Promise.all([
      this.articlesRepository.countFavoritesByArticleIds(articleIds),
      viewerId === null
        ? new Set<number>()
        : this.articlesRepository.findFavoritedArticleIds(viewerId, articleIds),
      viewerId === null
        ? new Set<number>()
        : this.followsRepository.findFollowedIds(viewerId, authorIds),
    ]);

    return {
      articles: articles.map((article) => ({
        slug: article.slug,
        title: article.title,
        description: article.description,
        tagList: article.tags.map((tag) => tag.name).sort(),
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        favorited: favoritedIds.has(article.id),
        favoritesCount: favoritesCounts.get(article.id) ?? 0,
        author: {
          username: article.author.username,
          bio: article.author.bio,
          image: article.author.image,
          following: followedIds.has(article.author.id),
        },
      })),
      articlesCount,
    };
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

  private async findOrCreateTags(
    tagList: string[],
    manager: EntityManager,
  ): Promise<Tag[]> {
    const names = [...new Set(tagList)];
    if (names.length === 0) {
      return [];
    }
    return this.tagsRepository.findOrCreateByNames(names, manager);
  }

  private async toResponse(
    article: Article,
    viewerId: number | null,
  ): Promise<SingleArticleResponseDto> {
    const author = article.author;
    const [favoritesCount, isFavorited, isFollowing] = await Promise.all([
      this.articlesRepository.countFavorites(article.id),
      viewerId === null
        ? false
        : this.articlesRepository.isFavoritedBy(article.id, viewerId),
      viewerId === null
        ? false
        : this.followsRepository.isFollowing(viewerId, author.id),
    ]);

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
