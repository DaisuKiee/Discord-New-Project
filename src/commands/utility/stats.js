import Command from '../../structures/Command.js';
import os from 'os';

export default class StatsCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'stats',
            description: {
                content: 'View bot statistics',
                usage: 'stats',
                examples: ['stats']
            },
            category: 'utility',
            aliases: ['botinfo', 'info'],
            cooldown: 5,
            args: false,
            permissions: {
                dev: false,
                client: ['SendMessages', 'EmbedLinks'],
                user: []
            },
            slashCommand: true,
            options: []
        });
    }

    async slashRun(interaction) {
        const client = interaction.client;
        const { createContainer } = await import('../../utils/components.js');
        const { MessageFlags } = await import('discord.js');
        
        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const uptime = this.formatUptime(client.uptime);
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        const container = createContainer([
            {
                title: '📊 Bot Statistics',
                thumbnail: client.user.displayAvatarURL(),
                separator: true
            },
            {
                title: '📈 General Stats',
                description: `🏠 **Servers:** ${client.guilds.cache.size.toLocaleString()}\n👥 **Users:** ${totalMembers.toLocaleString()}\n📝 **Commands:** ${client.commands.size}`,
                separator: true
            },
            {
                title: '⚡ Performance',
                description: `⏰ **Uptime:** ${uptime}\n💾 **Memory:** ${memoryUsage} MB\n🏓 **Ping:** ${Math.round(client.ws.ping)}ms`,
                separator: true
            },
            {
                title: '🖥️ System',
                description: `📦 **Node.js:** ${process.version}\n🖥️ **Platform:** ${os.platform()}\n⚙️ **CPU:** ${os.cpus()[0].model.split(' ')[0]}`,
                separator: true
            },
            {
                description: `**Shard:** ${interaction.guild.shardId + 1}/${client.shard?.count || 1}`
            }
        ]);

        return interaction.reply({ 
            components: [container],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });
    }

    formatUptime(ms) {
        const days = Math.floor(ms / 86400000);
        const hours = Math.floor(ms / 3600000) % 24;
        const minutes = Math.floor(ms / 60000) % 60;
        const seconds = Math.floor(ms / 1000) % 60;

        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
}
