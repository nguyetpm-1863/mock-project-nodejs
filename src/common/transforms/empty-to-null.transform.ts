import type { TransformFnParams } from 'class-transformer';

export const emptyToNull = ({ value }: TransformFnParams): unknown =>
  value === '' ? null : value;
