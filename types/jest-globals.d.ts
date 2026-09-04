/// <reference types="jest" />

import type { jest as jestGlobal } from '@jest/globals';

declare global {
  // eslint-disable-next-line no-var
  var jest: typeof jestGlobal;
}
