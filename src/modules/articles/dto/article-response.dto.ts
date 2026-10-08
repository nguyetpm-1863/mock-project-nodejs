import { ApiProperty } from '@nestjs/swagger';

export class ProfileDto {
  @ApiProperty({ example: 'jake' })
  username: string;

  @ApiProperty({ type: String, nullable: true })
  bio: string | null;

  @ApiProperty({ type: String, nullable: true })
  image: string | null;

  @ApiProperty()
  following: boolean;
}

export class ArticleDto {
  @ApiProperty({ example: 'how-to-train-your-dragon-1a2b3c4d' })
  slug: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ type: [String] })
  tagList: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  favorited: boolean;

  @ApiProperty()
  favoritesCount: number;

  @ApiProperty({ type: ProfileDto })
  author: ProfileDto;
}

export class SingleArticleResponseDto {
  @ApiProperty({ type: ArticleDto })
  article: ArticleDto;
}
