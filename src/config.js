import dotenv from "dotenv";
dotenv.config();

export const config = {
    // Bot
    token: process.env.TOKEN || "",
    clientId: process.env.CLIENT_ID || "",
    clientSecret: process.env.CLIENT_SECRET || "",
    prefix: process.env.PREFIX || "!",
    ownerID: process.env.OWNER_ID ? process.env.OWNER_ID.split(",") : [],
    
    // Database
    mongourl: process.env.MONGO_URL || "",
    databaseUrl: process.env.DATABASE_URL || "",
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
    
    // Dashboard
    dashboard: {
        port: process.env.DASHBOARD_PORT || 3000,
        url: process.env.DASHBOARD_URL || "http://localhost:3000",
        sessionSecret: process.env.SESSION_SECRET || "change-this-secret",
        callbackUrl: process.env.CALLBACK_URL || "http://localhost:3000/auth/callback"
    },
    
    // AI Services
    ai: {
        openai: process.env.OPENAI_API_KEY || "",
        anthropic: process.env.ANTHROPIC_API_KEY || "",
        google: process.env.GOOGLE_AI_KEY || "",
        defaultModel: "gpt-3.5-turbo",
        maxTokens: 2000,
        temperature: 0.7
    },
    
    // Lavalink Nodes (Production-ready)
    lavalink: {
        nodes: [
            {
                name: "Node-1",
                host: process.env.LAVALINK_HOST || "localhost",
                port: parseInt(process.env.LAVALINK_PORT) || 2333,
                password: process.env.LAVALINK_PASSWORD || "youshallnotpass",
                secure: process.env.LAVALINK_SECURE === "true"
            }
            // Add more nodes for redundancy in production
        ],
        spotify: {
            clientID: process.env.SPOTIFY_CLIENT_ID || "",
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET || ""
        }
    },
    
    // Colors
    color: {
        default: process.env.DEFAULT_COLOR || "#5865F2",
        error: process.env.ERROR_COLOR || "#ED4245",
        success: process.env.SUCCESS_COLOR || "#57F287",
        info: process.env.INFO_COLOR || "#5865F2",
        warn: process.env.WARN_COLOR || "#FEE75C",
    },

    logs: {
        channel: process.env.LOG_CHANNEL_ID || "1450801791221502022", // General log channel
        commands: process.env.COMMAND_LOG_CHANNEL_ID || "1450801791221502022", // Command usage logs
        guildJoin: process.env.GUILD_JOIN_LOG_CHANNEL_ID || "1450801770287861831", // Server join logs
        guildLeave: process.env.GUILD_LEAVE_LOG_CHANNEL_ID || "1450801770287861831", // Server leave logs
        errors: process.env.ERROR_LOG_CHANNEL_ID || "1450801791221502022" // Error logs
    },
    
    // Settings
    production: process.env.PRODUCTION === "true",
    guildId: process.env.GUILD_ID || "",
    logLevel: process.env.LOG_LEVEL || "info"
}
