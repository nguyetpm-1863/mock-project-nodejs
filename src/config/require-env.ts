import { MissingEnvError } from './missing-env.error.js';

export const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new MissingEnvError(key);
  }
  return value;
};
