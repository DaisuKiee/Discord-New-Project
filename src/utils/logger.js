import signale from 'signale';

export const logger = {
    info: (...args) => signale.info(...args),
    success: (...args) => signale.success(...args),
    error: (...args) => signale.error(...args),
    warn: (...args) => signale.warn(...args),
    debug: (...args) => signale.debug(...args),
    ready: (...args) => signale.success(...args),
    event: (...args) => signale.info(...args),
    cmd: (...args) => signale.success(...args)
};
