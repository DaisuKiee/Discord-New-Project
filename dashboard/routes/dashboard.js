import { Router } from 'express';
import { checkAuth } from '../middleware/auth.js';

const router = Router();

router.use(checkAuth);

// Helper function to check if bot is in guild
async function checkBotInGuild(guildId) {
    try {
        const manager = global.shardManager;
        if (manager) {
            const results = await manager.broadcastEval((client, context) => {
                const g = client.guilds.cache.get(context.guildId);
                return g ? { found: true, name: g.name } : { found: false };
            }, { context: { guildId } });
            return results.some(r => r.found);
        }
    } catch (error) {
        console.error('Failed to check bot in guild:', error);
    }
    return false;
}

router.get('/', async (req, res) => {
    const managedGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20); // MANAGE_GUILD
    res.render('dashboard/home', {
        user: req.user,
        guilds: managedGuilds
    });
});

router.get('/guild/:id', async (req, res) => {
    const guildId = req.params.id;
    const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
    
    const guild = userGuilds.find(g => g.id === guildId);
    if (!guild) {
        return res.redirect('/dashboard');
    }

    // Fetch guild stats from the bot
    let guildStats = {
        memberCount: 0,
        channelCount: 0,
        roleCount: 0,
        commandsUsed: 0,
        guildIcon: null
    };
    let botInGuild = false;

    try {
        const manager = global.shardManager;
        if (manager) {
            const results = await manager.broadcastEval((client, context) => {
                const g = client.guilds.cache.get(context.guildId);
                if (g) {
                    return {
                        found: true,
                        memberCount: g.memberCount,
                        channelCount: g.channels.cache.size,
                        roleCount: g.roles.cache.size,
                        guildIcon: g.iconURL({ size: 128 })
                    };
                }
                return { found: false };
            }, { context: { guildId } });

            const foundGuild = results.find(r => r.found);
            if (foundGuild) {
                botInGuild = true;
                guildStats = {
                    memberCount: foundGuild.memberCount,
                    channelCount: foundGuild.channelCount,
                    roleCount: foundGuild.roleCount,
                    commandsUsed: 0, // TODO: fetch from database if tracking
                    guildIcon: foundGuild.guildIcon
                };
            }
        }
    } catch (error) {
        console.error('Failed to fetch guild stats:', error);
    }

    res.render('dashboard/guild', {
        user: req.user,
        guildId,
        guildName: guild.name,
        botInGuild,
        ...guildStats
    });
});

router.get('/guild/:id/modules', async (req, res) => {
    const { prisma } = await import('../../src/utils/database.js');
    const { readdirSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    
    const guildId = req.params.id;
    const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
    
    const guild = userGuilds.find(g => g.id === guildId);
    if (!guild) {
        return res.redirect('/dashboard');
    }

    // Check if bot is in guild
    const botInGuild = await checkBotInGuild(guildId);
    if (!botInGuild) {
        return res.redirect(`/dashboard/guild/${guildId}`);
    }

    // Fetch actual command categories and counts from the bot
    let commandCategories = [];
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const commandsPath = join(__dirname, '../../src/commands');
        const categories = readdirSync(commandsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        for (const category of categories) {
            const categoryPath = join(commandsPath, category);
            const commands = readdirSync(categoryPath).filter(file => file.endsWith('.js'));
            commandCategories.push({
                name: category,
                commandCount: commands.length,
                commands: commands.map(f => f.replace('.js', ''))
            });
        }
    } catch (error) {
        console.error('Failed to fetch command categories:', error);
    }

    const guildData = await prisma.guild.findUnique({
        where: { guildId }
    });

    let modules = { moderation: true, ai: true, music: false, utility: false, config: true, tickets: true, welcome: true };
    if (guildData?.modulesEnabled) {
        modules = typeof guildData.modulesEnabled === 'string' 
            ? JSON.parse(guildData.modulesEnabled) 
            : guildData.modulesEnabled;
    }

    res.render('dashboard/modules', {
        user: req.user,
        guildId,
        guildName: guild.name,
        modules,
        commandCategories
    });
});

router.get('/guild/:id/settings', async (req, res) => {
    const guildId = req.params.id;
    const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
    const guild = userGuilds.find(g => g.id === guildId);
    
    if (!guild) return res.redirect('/dashboard');
    
    // Check if bot is in guild
    const botInGuild = await checkBotInGuild(guildId);
    if (!botInGuild) {
        return res.redirect(`/dashboard/guild/${guildId}`);
    }
    
    res.render('dashboard/settings', {
        user: req.user,
        guildId,
        guildName: guild.name
    });
});

router.get('/guild/:id/moderation', async (req, res) => {
    const guildId = req.params.id;
    const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
    const guild = userGuilds.find(g => g.id === guildId);
    
    if (!guild) return res.redirect('/dashboard');
    
    // Check if bot is in guild
    const botInGuild = await checkBotInGuild(guildId);
    if (!botInGuild) {
        return res.redirect(`/dashboard/guild/${guildId}`);
    }
    
    res.render('dashboard/moderation', {
        user: req.user,
        guildId,
        guildName: guild.name
    });
});

router.get('/guild/:id/analytics', async (req, res) => {
    const guildId = req.params.id;
    const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
    const guild = userGuilds.find(g => g.id === guildId);
    
    if (!guild) return res.redirect('/dashboard');
    
    // Check if bot is in guild
    const botInGuild = await checkBotInGuild(guildId);
    if (!botInGuild) {
        return res.redirect(`/dashboard/guild/${guildId}`);
    }
    
    res.render('dashboard/analytics', {
        user: req.user,
        guildId,
        guildName: guild.name
    });
});

router.get('/guild/:id/welcome', async (req, res) => {
    const { prisma } = await import('../../src/utils/database.js');
    const guildId = req.params.id;
    const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
    const guild = userGuilds.find(g => g.id === guildId);
    
    if (!guild) return res.redirect('/dashboard');

    // Check if bot is in guild
    const botInGuild = await checkBotInGuild(guildId);
    if (!botInGuild) {
        return res.redirect(`/dashboard/guild/${guildId}`);
    }

    // Fetch guild channels (mock for now - you'll need to fetch from Discord API)
    const channels = [
        { id: '1', name: 'general' },
        { id: '2', name: 'welcome' },
        { id: '3', name: 'announcements' }
    ];

    const guildData = await prisma.guild.findUnique({
        where: { guildId }
    });

    let embedData = {};
    if (guildData?.welcomeEmbed) {
        embedData = typeof guildData.welcomeEmbed === 'string' 
            ? JSON.parse(guildData.welcomeEmbed) 
            : guildData.welcomeEmbed;
    }

    res.render('dashboard/welcome', {
        user: req.user,
        guildId,
        guildName: guild.name,
        channels,
        settings: guildData || {},
        embedData
    });
});

router.get('/guild/:id/sticky', async (req, res) => {
    const { prisma } = await import('../../src/utils/database.js');
    const guildId = req.params.id;
    const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
    const guild = userGuilds.find(g => g.id === guildId);
    
    if (!guild) return res.redirect('/dashboard');

    // Check if bot is in guild
    const botInGuild = await checkBotInGuild(guildId);
    if (!botInGuild) {
        return res.redirect(`/dashboard/guild/${guildId}`);
    }

    const channels = [
        { id: '1', name: 'general' },
        { id: '2', name: 'announcements' },
        { id: '3', name: 'rules' }
    ];

    const stickies = await prisma.stickyMessage.findMany({
        where: { guildId }
    });

    // Add channel names to stickies
    const stickiesWithNames = stickies.map(sticky => ({
        ...sticky,
        channelName: channels.find(c => c.id === sticky.channelId)?.name || 'Unknown'
    }));

    res.render('dashboard/sticky', {
        user: req.user,
        guildId,
        guildName: guild.name,
        channels,
        stickies: stickiesWithNames
    });
});

router.get('/guild/:id/tickets', async (req, res) => {
    const { prisma } = await import('../../src/utils/database.js');
    const guildId = req.params.id;
    const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
    const guild = userGuilds.find(g => g.id === guildId);
    
    if (!guild) return res.redirect('/dashboard');

    // Check if bot is in guild
    const botInGuild = await checkBotInGuild(guildId);
    if (!botInGuild) {
        return res.redirect(`/dashboard/guild/${guildId}`);
    }

    // Fetch channels, categories, and roles from the bot
    let channels = [];
    let categories = [];
    let roles = [];

    try {
        const manager = global.shardManager;
        if (manager) {
            const results = await manager.broadcastEval((client, context) => {
                const g = client.guilds.cache.get(context.guildId);
                if (g) {
                    return {
                        found: true,
                        channels: g.channels.cache
                            .filter(c => c.type === 0) // Text channels
                            .map(c => ({ id: c.id, name: c.name }))
                            .sort((a, b) => a.name.localeCompare(b.name)),
                        categories: g.channels.cache
                            .filter(c => c.type === 4) // Category channels
                            .map(c => ({ id: c.id, name: c.name }))
                            .sort((a, b) => a.name.localeCompare(b.name)),
                        roles: g.roles.cache
                            .filter(r => r.id !== g.id && !r.managed) // Exclude @everyone and managed roles
                            .map(r => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position }))
                            .sort((a, b) => b.position - a.position)
                    };
                }
                return { found: false };
            }, { context: { guildId } });

            const foundGuild = results.find(r => r.found);
            if (foundGuild) {
                channels = foundGuild.channels;
                categories = foundGuild.categories;
                roles = foundGuild.roles;
            }
        }
    } catch (error) {
        console.error('Failed to fetch guild data:', error);
    }

    const guildData = await prisma.guild.findUnique({
        where: { guildId }
    });

    const settings = guildData?.settings || {};

    res.render('dashboard/tickets', {
        user: req.user,
        guildId,
        guildName: guild.name,
        channels,
        categories,
        roles,
        settings: typeof settings === 'string' ? JSON.parse(settings) : settings
    });
});

export default router;
