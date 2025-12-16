import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { logger } from './logger.js';

export const prisma = new PrismaClient();

export async function connectDatabase() {
    try {
        // Connect Mongoose
        if (config.mongourl) {
            await mongoose.connect(config.mongourl);
            logger.success('MongoDB connected via Mongoose');
        }
        
        // Test Prisma connection
        await prisma.$connect();
        logger.success('Prisma connected to database');
        
        return true;
    } catch (error) {
        logger.error('Database connection failed:', error);
        return false;
    }
}

export async function disconnectDatabase() {
    await prisma.$disconnect();
    await mongoose.disconnect();
    logger.info('Database connections closed');
}
