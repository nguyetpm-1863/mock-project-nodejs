import type { ValidationError } from '@nestjs/common';
import { BLANK_MESSAGE } from '../constants/error-messages.constants.js';
import { formatValidationErrors } from './format-validation-errors.js';

const fieldError = (
  property: string,
  constraints: Record<string, string>,
): ValidationError => ({ property, constraints, children: [] });

describe('formatValidationErrors', () => {
  it('keys nested errors by the leaf property', () => {
    const errors: ValidationError[] = [
      {
        property: 'user',
        children: [
          fieldError('email', { isEmail: 'email must be an email' }),
          fieldError('password', {
            isLength: 'password must be longer than or equal to 8 characters',
          }),
        ],
      },
    ];

    expect(formatValidationErrors(errors)).toEqual({
      email: ['email must be an email'],
      password: ['password must be longer than or equal to 8 characters'],
    });
  });

  it("reports only can't be blank when a value is missing", () => {
    const errors = [
      fieldError('username', {
        isNotEmpty: 'username should not be empty',
        maxLength: 'username must be shorter than or equal to 100 characters',
      }),
      fieldError('user', { isDefined: 'user should not be null or undefined' }),
    ];

    expect(formatValidationErrors(errors)).toEqual({
      username: [BLANK_MESSAGE],
      user: [BLANK_MESSAGE],
    });
  });
});
