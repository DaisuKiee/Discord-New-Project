import Command from '../../structures/Command.js';

export default class ServerInfoCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'serverinfo',
            description: {
                content: 'Get information about the server',
                usage: 'serverinfo',
                examples: ['serverinfo']
            },
            category: 'utility',
            aliases: ['server', 'guildinfo'],
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
        const guild = interaction.guild;
        const { createContainer } = await import('../../utils/components.js');
        const { MessageFlags } = await import('discord.js');

        const sections = [
            {
                title: `📊 ${guild.name}`,
                description: guild.description || 'No description set',
                thumbnail: guild.iconURL({ dynamic: true, size: 1024 }),
                separator: true
            },
            {
                title: '📋 Basic Info',
                description: `🆔 **ID:** ${guild.id}\n👑 **Owner:** <@${guild.ownerId}>\n📅 **Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
                separator: true
            },
            {
                title: '📊 Statistics',
                description: `👥 **Members:** ${guild.memberCount.toLocaleString()}\n📝 **Channels:** ${guild.channels.cache.size}\n😀 **Emojis:** ${guild.emojis.cache.size}\n🎭 **Roles:** ${guild.roles.cache.size}`,
                separator: true
            },
            {
                title: '💎 Boost Status',
                description: `🚀 **Boost Level:** Level ${guild.premiumTier}\n💎 **Boosts:** ${guild.premiumSubscriptionCount || 0}`
            }
        ];

        const container = createContainer(sections);

        return interaction.reply({ 
            components: [container],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });
    }
}
