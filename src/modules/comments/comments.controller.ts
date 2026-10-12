import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { noCacheResponse } from '../../common/decorators/no-cache-response.decorator.js';
import { AUTH_SCHEME } from '../auth/constants/auth.constants.js';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthContext } from '../auth/interfaces/auth-context.interface.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { CommentsService } from './comments.service.js';
import {
  MultipleCommentsResponseDto,
  SingleCommentResponseDto,
} from './dto/comment-response.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { ParseCommentIdPipe } from './pipes/parse-comment-id.pipe.js';

@ApiTags('comments')
@Controller('articles/:slug/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @noCacheResponse()
  @ApiSecurity(AUTH_SCHEME)
  @ApiCreatedResponse({ type: SingleCommentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token is missing or invalid' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  create(
    @Param('slug') slug: string,
    @CurrentAuth() { user }: AuthContext,
    @Body() { comment }: CreateCommentDto,
  ): Promise<SingleCommentResponseDto> {
    return this.commentsService.create(slug, user, comment);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @noCacheResponse()
  @ApiSecurity(AUTH_SCHEME)
  @ApiOkResponse({ type: MultipleCommentsResponseDto })
  @ApiNotFoundResponse({ description: 'Article not found' })
  list(
    @Param('slug') slug: string,
    @CurrentUserId() userId: number | null,
  ): Promise<MultipleCommentsResponseDto> {
    return this.commentsService.list(slug, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @noCacheResponse()
  @ApiSecurity(AUTH_SCHEME)
  @ApiNoContentResponse({ description: 'Comment deleted' })
  @ApiUnauthorizedResponse({ description: 'Token is missing or invalid' })
  @ApiForbiddenResponse({ description: 'Not the author of the comment' })
  @ApiNotFoundResponse({ description: 'Article or comment not found' })
  remove(
    @Param('slug') slug: string,
    @Param('id', ParseCommentIdPipe) id: number,
    @CurrentUserId() userId: number,
  ): Promise<void> {
    return this.commentsService.remove(slug, id, userId);
  }
}
