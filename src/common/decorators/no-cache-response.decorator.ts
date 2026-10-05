import { applyDecorators, Header } from '@nestjs/common';
import {
  CACHE_CONTROL_HEADER,
  CACHE_CONTROL_NO_CACHE_VALUE,
  EXPIRES_HEADER,
  EXPIRES_IMMEDIATELY_VALUE,
  PRAGMA_HEADER,
  PRAGMA_NO_CACHE_VALUE,
} from '../constants/security.constants.js';

export const noCacheResponse = () =>
  applyDecorators(
    Header(CACHE_CONTROL_HEADER, CACHE_CONTROL_NO_CACHE_VALUE),
    Header(PRAGMA_HEADER, PRAGMA_NO_CACHE_VALUE),
    Header(EXPIRES_HEADER, EXPIRES_IMMEDIATELY_VALUE),
  );
