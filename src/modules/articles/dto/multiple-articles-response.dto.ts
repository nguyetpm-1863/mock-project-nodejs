import { ApiProperty, OmitType } from '@nestjs/swagger';
import { ArticleDto } from './article-response.dto.js';

export class ArticleListItemDto extends OmitType(ArticleDto, ['body']) {}

export class MultipleArticlesResponseDto {
  @ApiProperty({ type: [ArticleListItemDto] })
  articles: ArticleListItemDto[];

  @ApiProperty({ example: 1 })
  articlesCount: number;
}
