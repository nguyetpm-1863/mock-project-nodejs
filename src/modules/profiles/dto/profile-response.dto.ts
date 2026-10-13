import { ApiProperty } from '@nestjs/swagger';
import { ProfileDto } from '../../articles/dto/article-response.dto.js';

export class ProfileResponseDto {
  @ApiProperty({ type: ProfileDto })
  profile: ProfileDto;
}
