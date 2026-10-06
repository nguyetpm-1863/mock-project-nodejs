import { randomBytes } from 'node:crypto';
import {
  SLUG_BASE_MAX_LENGTH,
  SLUG_FALLBACK_BASE,
  SLUG_SUFFIX_BYTES,
} from '../constants/article.constants.js';

export const slugifyTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, SLUG_BASE_MAX_LENGTH)
    .replace(/^-+|-+$/g, '');

export const generateSlug = (title: string): string => {
  const base = slugifyTitle(title) || SLUG_FALLBACK_BASE;
  const suffix = randomBytes(SLUG_SUFFIX_BYTES).toString('hex');
  return `${base}-${suffix}`;
};
