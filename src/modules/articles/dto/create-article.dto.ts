import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { trimString } from '../../../common/transforms/trim.transform.js';
import { isProvided } from '../../../common/validation/is-provided.js';
import { TAG_NAME_MAX_LENGTH } from '../../tags/constants/tag.constants.js';
import {
  ARTICLE_BODY_MAX_LENGTH,
  ARTICLE_DESCRIPTION_MAX_LENGTH,
  ARTICLE_TITLE_MAX_LENGTH,
  TAG_LIST_MAX_SIZE,
} from '../constants/article.constants.js';

export class CreateArticleFieldsDto {
  @ApiProperty({ example: 'How to train your dragon' })
  @Transform(trimString)
  @IsNotEmpty()
  @IsString()
  @MaxLength(ARTICLE_TITLE_MAX_LENGTH)
  title: string;

  @ApiProperty({ example: 'Ever wonder how?' })
  @Transform(trimString)
  @IsNotEmpty()
  @IsString()
  @MaxLength(ARTICLE_DESCRIPTION_MAX_LENGTH)
  description: string;

  @ApiProperty({ example: 'You have to believe' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(ARTICLE_BODY_MAX_LENGTH)
  body: string;

  @ApiPropertyOptional({ type: [String], example: ['dragons', 'training'] })
  @ValidateIf(isProvided)
  @IsArray()
  @ArrayMaxSize(TAG_LIST_MAX_SIZE)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(TAG_NAME_MAX_LENGTH, { each: true })
  tagList?: string[];
}

export class CreateArticleDto {
  @ApiProperty({ type: CreateArticleFieldsDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateArticleFieldsDto)
  article: CreateArticleFieldsDto;
}
