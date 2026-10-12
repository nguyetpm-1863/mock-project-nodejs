import { NOT_FOUND_MESSAGE } from '../../articles/constants/article.constants.js';
import { COMMENT_ID_MAX } from '../constants/comment.constants.js';
import { ParseCommentIdPipe } from './parse-comment-id.pipe.js';

describe('ParseCommentIdPipe', () => {
  const pipe = new ParseCommentIdPipe();

  it.each([
    ['1', 1],
    [`${COMMENT_ID_MAX}`, COMMENT_ID_MAX],
  ])('parses %s', (value, expected) => {
    expect(pipe.transform(value)).toBe(expected);
  });

  it.each([[`${COMMENT_ID_MAX + 1}`], ['abc'], ['1.5'], ['-1'], ['1e3'], ['']])(
    'rejects %j with 404 comment not found',
    (value) => {
      expect(() => pipe.transform(value)).toThrow(
        expect.objectContaining({
          status: 404,
          response: { errors: { comment: [NOT_FOUND_MESSAGE] } },
        }),
      );
    },
  );
});
