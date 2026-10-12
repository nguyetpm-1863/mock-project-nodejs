import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { trimString } from '../../../common/transforms/trim.transform.js';
import { COMMENT_BODY_MAX_LENGTH } from '../constants/comment.constants.js';

export class CreateCommentFieldsDto {
  @ApiProperty({ example: 'It takes a Jacobian' })
  @Transform(trimString)
  @IsNotEmpty()
  @IsString()
  @MaxLength(COMMENT_BODY_MAX_LENGTH)
  body: string;
}

export class CreateCommentDto {
  @ApiProperty({ type: CreateCommentFieldsDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateCommentFieldsDto)
  comment: CreateCommentFieldsDto;
}
