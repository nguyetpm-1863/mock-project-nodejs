export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_PATTERN = /^[\x20-\x7E]+$/;
export const PASSWORD_CHARACTERS_MESSAGE =
  'password can only contain English letters, digits and symbols';
export const PASSWORD_HASH_ROUNDS = 10;
export const FALLBACK_SECRET_BYTES = 32;
export const JWT_SECRET_MIN_LENGTH = 32;
export const DEFAULT_JWT_EXPIRES_IN_SECONDS = 604_800;
export const CREDENTIALS_ERROR_FIELD = 'credentials';
export const TOKEN_ERROR_FIELD = 'token';
export const UPDATE_USER_ERROR_FIELD = 'user';
export const AUTH_SCHEME = 'Token';
export const TOKEN_DENYLIST_KEY_PREFIX = 'auth:denylist:';
export const TOKEN_DENYLIST_VALUE = '1';
export const MILLISECONDS_PER_SECOND = 1000;
