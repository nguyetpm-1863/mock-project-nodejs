import { ApiProperty } from '@nestjs/swagger';
import { ProfileDto } from '../../articles/dto/article-response.dto.js';

export class CommentDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ example: 'It takes a Jacobian' })
  body: string;

  @ApiProperty({ type: ProfileDto })
  author: ProfileDto;
}

export class SingleCommentResponseDto {
  @ApiProperty({ type: CommentDto })
  comment: CommentDto;
}

export class MultipleCommentsResponseDto {
  @ApiProperty({ type: [CommentDto] })
  comments: CommentDto[];
}
