import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { emptyToNull } from '../../../common/transforms/empty-to-null.transform.js';
import { normalizeEmail } from '../../../common/transforms/normalize-email.transform.js';
import { trimString } from '../../../common/transforms/trim.transform.js';
import {
  PASSWORD_CHARACTERS_MESSAGE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from '../../auth/constants/auth.constants.js';
import {
  USER_BIO_MAX_LENGTH,
  USER_EMAIL_MAX_LENGTH,
  USER_IMAGE_MAX_LENGTH,
  USER_IMAGE_PROTOCOLS,
  USERNAME_CHARACTERS_MESSAGE,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from '../constants/user.constants.js';

const isProvided = (_object: object, value: unknown): boolean =>
  value !== undefined;

export class UpdateUserFieldsDto {
  @ApiPropertyOptional({ example: 'jake@jake.jake' })
  @ValidateIf(isProvided)
  @Transform(normalizeEmail)
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(USER_EMAIL_MAX_LENGTH)
  email?: string;

  @ApiPropertyOptional({ example: 'jake' })
  @ValidateIf(isProvided)
  @Transform(trimString)
  @IsNotEmpty()
  @IsString()
  @MaxLength(USERNAME_MAX_LENGTH)
  @Matches(USERNAME_PATTERN, { message: USERNAME_CHARACTERS_MESSAGE })
  username?: string;

  @ApiPropertyOptional({
    format: 'password',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @ValidateIf(isProvided)
  @IsNotEmpty()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_CHARACTERS_MESSAGE })
  password?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'I like to skateboard',
    maxLength: USER_BIO_MAX_LENGTH,
  })
  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(USER_BIO_MAX_LENGTH)
  bio?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://i.stack.imgur.com/xHWG8.jpg',
  })
  @Transform(emptyToNull)
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: USER_IMAGE_PROTOCOLS })
  @MaxLength(USER_IMAGE_MAX_LENGTH)
  image?: string | null;
}

export class UpdateUserDto {
  @ApiProperty({ type: UpdateUserFieldsDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateUserFieldsDto)
  user: UpdateUserFieldsDto;
}
