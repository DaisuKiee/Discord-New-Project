import { Router } from 'express';
import { checkAuth } from '../middleware/auth.js';
import { prisma } from '../../src/utils/database.js';

const router = Router();

// Helper function to format uptime
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

// Public endpoint for bot info (no auth required)
router.get('/bot-info', async (req, res) => {
    try {
        const manager = global.shardManager;
        
        if (!manager) {
            return res.json({
                username: 'Discord Bot',
                avatar: null,
                id: null,
                guilds: 0,
                users: 0,
                topGuilds: []
            });
        }
        
        // Get bot info from all shards
        const results = await manager.broadcastEval(client => ({
            username: client.user?.username,
            avatar: client.user?.displayAvatarURL({ size: 256 }),
            id: client.user?.id,
            guilds: client.guilds.cache.size,
            users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
            topGuilds: client.guilds.cache
                .sort((a, b) => b.memberCount - a.memberCount)
                .first(10)
                .map(g => ({
                    id: g.id,
                    name: g.name,
                    icon: g.iconURL({ size: 128 }),
                    members: g.memberCount
                }))
        }));
        
        // Combine results from all shards
        const botInfo = {
            username: results[0]?.username || 'Discord Bot',
            avatar: results[0]?.avatar || null,
            id: results[0]?.id || null,
            guilds: results.reduce((acc, r) => acc + (r.guilds || 0), 0),
            users: results.reduce((acc, r) => acc + (r.users || 0), 0),
            topGuilds: []
        };
        
        // Combine and sort top guilds from all shards
        const allGuilds = results.flatMap(r => r.topGuilds || []);
        botInfo.topGuilds = allGuilds
            .sort((a, b) => b.members - a.members)
            .slice(0, 10);
        
        res.json(botInfo);
    } catch (error) {
        console.error('Bot info error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch bot info',
            username: 'Discord Bot',
            avatar: null,
            id: null,
            guilds: 0,
            users: 0,
            topGuilds: []
        });
    }
});

// Public endpoint for shard status
router.get('/shard-status', async (req, res) => {
    try {
        const manager = global.shardManager;
        
        if (!manager) {
            return res.json({
                shards: [],
                system: {
                    memory: '0 MB',
                    cpu: '0%',
                    uptime: '0s'
                }
            });
        }
        
        // Get shard info from all shards
        const shardData = await manager.broadcastEval(client => ({
            id: client.shard.ids[0],
            status: client.ws.status,
            guilds: client.guilds.cache.size,
            users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
            latency: client.ws.ping,
            uptime: client.uptime,
            memory: process.memoryUsage().heapUsed
        }));
        
        // Format shard data
        const shards = shardData.map(shard => ({
            id: shard.id,
            status: shard.status === 0 ? 'ready' : shard.status === 1 ? 'connecting' : 'offline',
            guilds: shard.guilds,
            users: shard.users,
            latency: Math.round(shard.latency),
            uptime: formatUptime(shard.uptime)
        }));
        
        // Calculate system stats
        const totalMemory = shardData.reduce((acc, s) => acc + s.memory, 0);
        const avgUptime = shardData.reduce((acc, s) => acc + s.uptime, 0) / shardData.length;
        
        res.json({
            shards,
            system: {
                memory: `${Math.round(totalMemory / 1024 / 1024)} MB`,
                cpu: '0%', // CPU usage requires additional monitoring
                uptime: formatUptime(avgUptime)
            }
        });
    } catch (error) {
        console.error('Shard status error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch shard status',
            shards: [],
            system: {
                memory: '0 MB',
                cpu: '0%',
                uptime: '0s'
            }
        });
    }
});

// Public endpoint for commands
router.get('/commands', async (req, res) => {
    try {
        const manager = global.shardManager;
        
        if (!manager) {
            return res.json({
                commands: [],
                categories: []
            });
        }
        
        // Get commands from the first shard
        const commandsData = await manager.broadcastEval(client => {
            const commands = [];
            const categories = new Set();
            
            client.commands?.forEach(cmd => {
                const category = cmd.category || 'Utility';
                categories.add(category);
                
                commands.push({
                    name: cmd.data?.name || cmd.name,
                    description: cmd.data?.description || cmd.description || 'No description',
                    category: category,
                    options: cmd.data?.options?.map(opt => ({
                        name: opt.name,
                        description: opt.description,
                        required: opt.required || false
                    })) || []
                });
            });
            
            return {
                commands,
                categories: Array.from(categories)
            };
        });
        
        // Combine results from all shards (commands should be the same)
        const result = commandsData[0] || { commands: [], categories: [] };
        
        // Create category objects with icons
        const categoryIcons = {
            'Moderation': 'fas fa-shield-alt',
            'Music': 'fas fa-music',
            'Economy': 'fas fa-coins',
            'Fun': 'fas fa-gamepad',
            'Utility': 'fas fa-tools',
            'AI': 'fas fa-brain',
            'Leveling': 'fas fa-chart-line',
            'Tickets': 'fas fa-ticket-alt',
            'Admin': 'fas fa-crown',
            'Information': 'fas fa-info-circle'
        };
        
        const categories = result.categories.map(cat => ({
            name: cat,
            icon: categoryIcons[cat] || 'fas fa-folder'
        }));
        
        res.json({
            commands: result.commands,
            categories: categories
        });
    } catch (error) {
        console.error('Commands fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch commands',
            commands: [],
            categories: []
        });
    }
});

// Public endpoint for command traffic
router.get('/command-traffic', async (req, res) => {
    try {
        // Generate mock data for 24 hours
        // In production, you'd fetch this from your database/analytics
        const now = Date.now();
        const labels = [];
        const values = [];
        
        for (let i = 24; i >= 0; i--) {
            const time = new Date(now - i * 60 * 60 * 1000);
            labels.push(i === 0 ? 'Now' : `${i}h ago`);
            // Generate realistic-looking data
            values.push(Math.floor(Math.random() * 2000) + 1500);
        }
        
        res.json({ labels, values });
    } catch (error) {
        console.error('Command traffic error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch command traffic',
            labels: [],
            values: []
        });
    }
});

router.use(checkAuth);

// Get guild settings
router.get('/guild/:id/settings', async (req, res) => {
    try {
        const guild = await prisma.guild.findUnique({
            where: { guildId: req.params.id }
        });
        
        res.json(guild || {});
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update guild settings
router.post('/guild/:id/settings', async (req, res) => {
    try {
        const guild = await prisma.guild.upsert({
            where: { guildId: req.params.id },
            update: req.body,
            create: {
                guildId: req.params.id,
                ...req.body
            }
        });
        
        res.json(guild);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Get moderation cases
router.get('/guild/:id/cases', async (req, res) => {
    try {
        const cases = await prisma.case.findMany({
            where: { guildId: req.params.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        
        res.json(cases);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
});

// Get leaderboard
router.get('/guild/:id/leaderboard', async (req, res) => {
    try {
        const members = await prisma.member.findMany({
            where: { guildId: req.params.id },
            orderBy: [
                { level: 'desc' },
                { xp: 'desc' }
            ],
            take: 100
        });
        
        res.json(members);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Toggle module
router.post('/guild/:id/modules', async (req, res) => {
    try {
        const { module, enabled } = req.body;
        const guildId = req.params.id;
        
        // Verify user has permission
        const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
        if (!userGuilds.find(g => g.id === guildId)) {
            return res.status(403).json({ error: 'No permission' });
        }
        
        const guild = await prisma.guild.findUnique({
            where: { guildId }
        });
        
        let modules = guild?.modulesEnabled || {};
        if (typeof modules === 'string') {
            modules = JSON.parse(modules);
        }
        
        modules[module] = enabled;
        
        await prisma.guild.upsert({
            where: { guildId },
            update: { modulesEnabled: modules },
            create: { guildId, modulesEnabled: modules }
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Module toggle error:', error);
        res.status(500).json({ error: 'Failed to update module' });
    }
});

// Welcome settings
router.post('/guild/:id/welcome', async (req, res) => {
    try {
        const guildId = req.params.id;
        const { welcomeChannel, mode, welcomeMessage, welcomeEmbed } = req.body;
        
        const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
        if (!userGuilds.find(g => g.id === guildId)) {
            return res.status(403).json({ error: 'No permission' });
        }

        const updateData = { welcomeChannel };
        if (mode === 'text') {
            updateData.welcomeMessage = welcomeMessage;
            updateData.welcomeEmbed = null;
        } else {
            updateData.welcomeEmbed = welcomeEmbed;
            updateData.welcomeMessage = null;
        }

        await prisma.guild.upsert({
            where: { guildId },
            update: updateData,
            create: { guildId, ...updateData }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Welcome settings error:', error);
        res.status(500).json({ error: 'Failed to save welcome settings' });
    }
});

// Sticky messages
router.post('/guild/:id/sticky', async (req, res) => {
    try {
        const guildId = req.params.id;
        const { channelId, content } = req.body;
        
        const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
        if (!userGuilds.find(g => g.id === guildId)) {
            return res.status(403).json({ error: 'No permission' });
        }

        await prisma.stickyMessage.upsert({
            where: { channelId },
            update: { content, enabled: true },
            create: { guildId, channelId, content, enabled: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Sticky create error:', error);
        res.status(500).json({ error: 'Failed to create sticky' });
    }
});

router.delete('/guild/:id/sticky/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;
        
        await prisma.stickyMessage.delete({
            where: { channelId }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Sticky delete error:', error);
        res.status(500).json({ error: 'Failed to delete sticky' });
    }
});

// Ticket settings
router.post('/guild/:id/tickets', async (req, res) => {
    try {
        const guildId = req.params.id;
        const data = req.body;
        
        const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
        if (!userGuilds.find(g => g.id === guildId)) {
            return res.status(403).json({ error: 'No permission' });
        }

        const guild = await prisma.guild.findUnique({
            where: { guildId }
        });

        let settings = guild?.settings || {};
        if (typeof settings === 'string') {
            settings = JSON.parse(settings);
        }

        settings = { ...settings, ...data };

        await prisma.guild.upsert({
            where: { guildId },
            update: { 
                ticketCategory: data.ticketCategory,
                ticketMessage: data.ticketMessage,
                settings 
            },
            create: { 
                guildId, 
                ticketCategory: data.ticketCategory,
                ticketMessage: data.ticketMessage,
                settings 
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Ticket settings error:', error);
        res.status(500).json({ error: 'Failed to save ticket settings' });
    }
});

router.post('/guild/:id/ticket-panel', async (req, res) => {
    try {
        const guildId = req.params.id;
        const { channelId, message } = req.body;
        
        // Here you would send the ticket panel message to Discord
        // For now, just return success
        res.json({ success: true });
    } catch (error) {
        console.error('Ticket panel error:', error);
        res.status(500).json({ error: 'Failed to send panel' });
    }
});

export default router;
