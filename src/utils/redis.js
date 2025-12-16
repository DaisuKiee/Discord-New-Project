import Redis from 'ioredis';
import { config } from '../config.js';
import { logger } from './logger.js';

export const redis = new Redis(config.redisUrl, {
    retryStrategy: (times) => {
        // Stop retrying after 3 attempts
        if (times > 3) {
            logger.warn('Redis connection failed. Running without cache.');
            return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true, // Don't connect immediately
    enableOfflineQueue: false
});

// Try to connect, but don't crash if it fails
redis.connect().catch(() => {
    logger.warn('Redis not available. Bot will run without caching.');
});

redis.on('connect', () => {
    logger.success('Redis connected');
});

redis.on('error', (err) => {
    // Only log once, not repeatedly
    if (!redis.isErrorLogged) {
        logger.warn('Redis error - running without cache');
        redis.isErrorLogged = true;
    }
});

// Cache helpers with fallback
export const cache = {
    async get(key) {
        try {
            if (redis.status !== 'ready') return null;
            const data = await redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            return null; // Fail silently
        }
    },
    
    async set(key, value, ttl = 3600) {
        try {
            if (redis.status !== 'ready') return;
            await redis.setex(key, ttl, JSON.stringify(value));
        } catch (error) {
            // Fail silently
        }
    },
    
    async del(key) {
        try {
            if (redis.status !== 'ready') return;
            await redis.del(key);
        } catch (error) {
            // Fail silently
        }
    },
    
    async exists(key) {
        try {
            if (redis.status !== 'ready') return false;
            return await redis.exists(key);
        } catch (error) {
            return false;
        }
    }
};
