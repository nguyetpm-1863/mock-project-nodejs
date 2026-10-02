import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { normalizeEmail } from '../../../common/transforms/normalize-email.transform.js';
import { USER_EMAIL_MAX_LENGTH } from '../../users/constants/user.constants.js';

export class LoginUserDto {
  @ApiProperty({ example: 'jake@jake.jake', maxLength: USER_EMAIL_MAX_LENGTH })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(USER_EMAIL_MAX_LENGTH)
  email: string;

  @ApiProperty({ example: 'jakejake', format: 'password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LoginDto {
  @ApiProperty({ type: LoginUserDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => LoginUserDto)
  user: LoginUserDto;
}
