import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { normalizeEmail } from '../../../common/transforms/normalize-email.transform.js';
import { trimString } from '../../../common/transforms/trim.transform.js';
import {
  USER_EMAIL_MAX_LENGTH,
  USERNAME_CHARACTERS_MESSAGE,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from '../../users/constants/user.constants.js';
import {
  PASSWORD_CHARACTERS_MESSAGE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from '../constants/auth.constants.js';

export class SignupUserDto {
  @ApiProperty({ example: 'Jacob', maxLength: USERNAME_MAX_LENGTH })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(USERNAME_MAX_LENGTH)
  @Matches(USERNAME_PATTERN, { message: USERNAME_CHARACTERS_MESSAGE })
  username: string;

  @ApiProperty({ example: 'jake@jake.jake', maxLength: USER_EMAIL_MAX_LENGTH })
  @Transform(normalizeEmail)
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(USER_EMAIL_MAX_LENGTH)
  email: string;

  @ApiProperty({
    example: 'jakejake',
    format: 'password',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_CHARACTERS_MESSAGE })
  password: string;
}

export class SignupDto {
  @ApiProperty({ type: SignupUserDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => SignupUserDto)
  user: SignupUserDto;
}
