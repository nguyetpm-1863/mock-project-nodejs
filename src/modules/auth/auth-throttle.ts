import { DEFAULT_RATE_LIMIT_WINDOW_MS } from '../../common/constants/app.constants.js';
import { requireEnv } from '../../config/require-env.js';

export const AUTH_THROTTLE = {
  default: {
    limit: () => Number(requireEnv('AUTH_RATE_LIMIT')),
    ttl: DEFAULT_RATE_LIMIT_WINDOW_MS,
  },
};
