import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { noCacheResponse } from '../../common/decorators/no-cache-response.decorator.js';
import { SingleArticleResponseDto } from '../articles/dto/article-response.dto.js';
import { AUTH_SCHEME } from '../auth/constants/auth.constants.js';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FavoritesService } from './favorites.service.js';

@ApiTags('favorites')
@Controller('articles/:slug/favorite')
@UseGuards(JwtAuthGuard)
@ApiSecurity(AUTH_SCHEME)
@ApiUnauthorizedResponse({ description: 'Token is missing or invalid' })
@ApiNotFoundResponse({ description: 'Article not found' })
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @noCacheResponse()
  @ApiOkResponse({ type: SingleArticleResponseDto })
  favorite(
    @Param('slug') slug: string,
    @CurrentUserId() userId: number,
  ): Promise<SingleArticleResponseDto> {
    return this.favoritesService.favorite(slug, userId);
  }

  @Delete()
  @noCacheResponse()
  @ApiOkResponse({ type: SingleArticleResponseDto })
  unfavorite(
    @Param('slug') slug: string,
    @CurrentUserId() userId: number,
  ): Promise<SingleArticleResponseDto> {
    return this.favoritesService.unfavorite(slug, userId);
  }
}
