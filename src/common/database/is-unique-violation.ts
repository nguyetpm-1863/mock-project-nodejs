import { QueryFailedError } from 'typeorm';
import { PG_UNIQUE_VIOLATION } from '../constants/database.constants.js';

export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION;
