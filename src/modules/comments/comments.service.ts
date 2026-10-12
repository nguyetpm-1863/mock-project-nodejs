import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { apiErrors } from '../../common/errors/api-errors.js';
import {
  ARTICLE_ERROR_FIELD,
  FORBIDDEN_MESSAGE,
  NOT_FOUND_MESSAGE,
} from '../articles/constants/article.constants.js';
import type { User } from '../users/entities/user.entity.js';
import { ArticlesRepository } from '../articles/articles.repository.js';
import { FollowsRepository } from '../users/follows.repository.js';
import { CommentsRepository } from './comments.repository.js';
import { COMMENT_ERROR_FIELD } from './constants/comment.constants.js';
import type {
  CommentDto,
  MultipleCommentsResponseDto,
  SingleCommentResponseDto,
} from './dto/comment-response.dto.js';
import type { CreateCommentFieldsDto } from './dto/create-comment.dto.js';
import type { Comment } from './entities/comment.entity.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly articlesRepository: ArticlesRepository,
    private readonly followsRepository: FollowsRepository,
  ) {}

  async create(
    slug: string,
    user: User,
    dto: CreateCommentFieldsDto,
  ): Promise<SingleCommentResponseDto> {
    const articleId = await this.findArticleId(slug);
    const saved = await this.commentsRepository.save({
      body: dto.body,
      author: { id: user.id },
      article: { id: articleId },
    });
    const [comment] = await this.toResponses(
      [{ ...saved, author: user }],
      user.id,
    );
    return { comment };
  }

  async list(
    slug: string,
    viewerId: number | null,
  ): Promise<MultipleCommentsResponseDto> {
    const articleId = await this.findArticleId(slug);
    const comments = await this.commentsRepository.findByArticleId(articleId);
    return { comments: await this.toResponses(comments, viewerId) };
  }

  async remove(slug: string, id: number, userId: number): Promise<void> {
    const articleId = await this.findArticleId(slug);
    const comment = await this.commentsRepository.findInArticle(articleId, id);
    if (!comment) {
      throw new NotFoundException(
        apiErrors({ [COMMENT_ERROR_FIELD]: [NOT_FOUND_MESSAGE] }),
      );
    }
    if (comment.author.id !== userId) {
      throw new ForbiddenException(
        apiErrors({ [COMMENT_ERROR_FIELD]: [FORBIDDEN_MESSAGE] }),
      );
    }
    await this.commentsRepository.deleteById(comment.id);
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

  private async toResponses(
    comments: Comment[],
    viewerId: number | null,
  ): Promise<CommentDto[]> {
    const authorIds = comments.map((comment) => comment.author.id);
    const followedIds =
      viewerId === null || comments.length === 0
        ? new Set<number>()
        : await this.followsRepository.findFollowedIds(viewerId, authorIds);

    return comments.map((comment) => ({
      id: comment.id,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      body: comment.body,
      author: {
        username: comment.author.username,
        bio: comment.author.bio,
        image: comment.author.image,
        following: followedIds.has(comment.author.id),
      },
    }));
  }
}
