import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
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
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { ArticlesService } from './articles.service.js';
import { SingleArticleResponseDto } from './dto/article-response.dto.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import {
  ListArticlesQueryDto,
  PaginationQueryDto,
} from './dto/list-articles-query.dto.js';
import { MultipleArticlesResponseDto } from './dto/multiple-articles-response.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @noCacheResponse()
  @ApiSecurity(AUTH_SCHEME)
  @ApiCreatedResponse({ type: SingleArticleResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token is missing or invalid' })
  @ApiConflictResponse({ description: 'Slug already taken' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  create(
    @CurrentUserId() userId: number,
    @Body() { article }: CreateArticleDto,
  ): Promise<SingleArticleResponseDto> {
    return this.articlesService.create(userId, article);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @noCacheResponse()
  @ApiSecurity(AUTH_SCHEME)
  @ApiOkResponse({ type: MultipleArticlesResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Invalid query parameters' })
  list(
    @Query() query: ListArticlesQueryDto,
    @CurrentUserId() userId: number | null,
  ): Promise<MultipleArticlesResponseDto> {
    return this.articlesService.list(query, userId);
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  @noCacheResponse()
  @ApiSecurity(AUTH_SCHEME)
  @ApiOkResponse({ type: MultipleArticlesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token is missing or invalid' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid query parameters' })
  feed(
    @Query() query: PaginationQueryDto,
    @CurrentUserId() userId: number,
  ): Promise<MultipleArticlesResponseDto> {
    return this.articlesService.feed(query, userId);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiSecurity(AUTH_SCHEME)
  @ApiOkResponse({ type: SingleArticleResponseDto })
  @ApiNotFoundResponse({ description: 'Article not found' })
  findOne(
    @Param('slug') slug: string,
    @CurrentUserId() userId: number | null,
  ): Promise<SingleArticleResponseDto> {
    return this.articlesService.findBySlug(slug, userId);
  }

  @Put(':slug')
  @UseGuards(JwtAuthGuard)
  @noCacheResponse()
  @ApiSecurity(AUTH_SCHEME)
  @ApiOkResponse({ type: SingleArticleResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token is missing or invalid' })
  @ApiForbiddenResponse({ description: 'Not the author of the article' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  update(
    @Param('slug') slug: string,
    @CurrentUserId() userId: number,
    @Body() { article }: UpdateArticleDto,
  ): Promise<SingleArticleResponseDto> {
    return this.articlesService.update(slug, userId, article);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @noCacheResponse()
  @ApiSecurity(AUTH_SCHEME)
  @ApiNoContentResponse({ description: 'Article deleted' })
  @ApiUnauthorizedResponse({ description: 'Token is missing or invalid' })
  @ApiForbiddenResponse({ description: 'Not the author of the article' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  remove(
    @Param('slug') slug: string,
    @CurrentUserId() userId: number,
  ): Promise<void> {
    return this.articlesService.remove(slug, userId);
  }
}
