import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 'jake@jake.jake' })
  email: string;

  @ApiProperty()
  token: string;

  @ApiProperty({ example: 'jake' })
  username: string;

  @ApiProperty({ type: String, nullable: true, example: 'I work at statefarm' })
  bio: string | null;

  @ApiProperty({ type: String, nullable: true })
  image: string | null;
}

export class AuthUserResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
