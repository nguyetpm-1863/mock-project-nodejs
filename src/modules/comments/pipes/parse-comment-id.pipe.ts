import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { apiErrors } from '../../../common/errors/api-errors.js';
import { NOT_FOUND_MESSAGE } from '../../articles/constants/article.constants.js';
import {
  COMMENT_ERROR_FIELD,
  COMMENT_ID_MAX,
} from '../constants/comment.constants.js';

@Injectable()
export class ParseCommentIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);
    if (!/^\d+$/.test(value) || id > COMMENT_ID_MAX) {
      throw new NotFoundException(
        apiErrors({ [COMMENT_ERROR_FIELD]: [NOT_FOUND_MESSAGE] }),
      );
    }
    return id;
  }
}
