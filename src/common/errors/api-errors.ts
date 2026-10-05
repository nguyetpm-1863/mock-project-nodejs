export type ApiErrors = Record<string, string[]>;

export interface ApiErrorsBody {
  errors: ApiErrors;
}

export const apiErrors = (errors: ApiErrors): ApiErrorsBody => ({ errors });

export const isApiErrorsBody = (value: unknown): value is ApiErrorsBody =>
  typeof value === 'object' &&
  value !== null &&
  'errors' in value &&
  typeof value.errors === 'object' &&
  value.errors !== null;
