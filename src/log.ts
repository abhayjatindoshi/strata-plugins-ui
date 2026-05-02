import debug from 'debug';

const root = debug('plugins-ui');

function createLogger(module: string) {
  const base = root.extend(module);
  return Object.assign(base, {
    warn: base.extend('warn'),
    error: base.extend('error'),
  });
}

export const log = {
  strata: createLogger('strata'),
  tenant: createLogger('tenant'),
  wizard: createLogger('wizard'),
  explorer: createLogger('explorer'),
  ops: createLogger('ops'),
  guard: createLogger('guard'),
};
