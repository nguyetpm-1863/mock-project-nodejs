import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from '../constants/article.constants.js';

const emptyToUndefined = ({ value }: TransformFnParams): unknown =>
  value === '' ? undefined : value;

export class PaginationQueryDto {
  @ApiPropertyOptional({
    default: DEFAULT_PAGE_LIMIT,
    minimum: 1,
    maximum: MAX_PAGE_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit: number = DEFAULT_PAGE_LIMIT;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}

export class ListArticlesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by tag name' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Filter by author username' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ description: 'Filter by username who favorited' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  favorited?: string;
}
