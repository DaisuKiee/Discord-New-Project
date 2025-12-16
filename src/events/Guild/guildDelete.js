import Event from '../../structures/Event.js';
import { EmbedBuilder } from 'discord.js';

export default class GuildDelete extends Event {
    constructor(...args) {
        super(...args, {
            name: 'guildDelete',
            once: false,
        });
    }

    async run(guild) {
        const client = this.client;
        const { config } = await import('../../config.js');
        const { logger } = await import('../../utils/logger.js');
        logger.warn(`Left guild: ${guild.name} (${guild.id})`);

        // Get guild owner
        const owner = await guild.fetchOwner().catch(() => null);

        // Calculate bot percentage (with null checks)
        const memberCount = guild.memberCount || guild.members?.cache.size || 0;
        const botCount = guild.members?.cache.filter(m => m.user.bot).size || 0;
        const botPercentage = memberCount > 0 ? ((botCount / memberCount) * 100).toFixed(1) : '0.0';

        // Get verification level
        const verificationLevels = {
            0: 'None',
            1: 'Low',
            2: 'Medium',
            3: 'High',
            4: 'Very High'
        };

        // Get boost info
        const boostTier = guild.premiumTier || 0;
        const boostCount = guild.premiumSubscriptionCount || 0;

        // Calculate how long we were in the server
        const joinedTimestamp = guild.members.me?.joinedTimestamp;
        const duration = joinedTimestamp ? Date.now() - joinedTimestamp : 0;
        const days = Math.floor(duration / (1000 * 60 * 60 * 24));
        const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        // Create embed
        const embed = new EmbedBuilder()
            .setColor(0xED4245) // Red for leave
            .setTitle('📤 Left Server')
            .setThumbnail(guild.iconURL({ size: 256 }))
            .addFields(
                {
                    name: '📋 Server Information',
                    value: [
                        `**Name:** ${guild.name}`,
                        `**ID:** \`${guild.id}\``,
                        `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '👑 Owner',
                    value: owner ? `${owner.user.tag}\n\`${owner.id}\`` : 'Unknown',
                    inline: true
                },
                {
                    name: '👥 Members',
                    value: [
                        `**Total:** ${memberCount.toLocaleString()}`,
                        `**Humans:** ${(memberCount - botCount).toLocaleString()}`,
                        `**Bots:** ${botCount} (${botPercentage}%)`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '⏱️ Duration',
                    value: joinedTimestamp 
                        ? `${days}d ${hours}h\nJoined: <t:${Math.floor(joinedTimestamp / 1000)}:R>`
                        : 'Unknown',
                    inline: true
                },
                {
                    name: '📊 Server Stats',
                    value: [
                        `**Channels:** ${guild.channels?.cache.size || 0}`,
                        `**Roles:** ${guild.roles?.cache.size || 0}`,
                        `**Emojis:** ${guild.emojis?.cache.size || 0}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🔒 Security',
                    value: [
                        `**Verification:** ${verificationLevels[guild.verificationLevel] || 'Unknown'}`,
                        `**2FA Required:** ${guild.mfaLevel === 1 ? 'Yes' : 'No'}`,
                        `**Explicit Filter:** ${guild.explicitContentFilter === 2 ? 'All' : guild.explicitContentFilter === 1 ? 'No Role' : 'Disabled'}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '💎 Boost Status',
                    value: [
                        `**Tier:** ${boostTier}`,
                        `**Boosts:** ${boostCount}`,
                        `**Features:** ${guild.features?.length || 0}`
                    ].join('\n'),
                    inline: true
                }
            )
            .setFooter({ 
                text: `Total Servers: ${client.guilds.cache.size}`,
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        // Add banner if available
        if (guild.banner) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }

        // Send to log channel
        const logChannelId = config.logs?.guildLeave || config.logs?.channel;
        if (logChannelId) {
            const logChannel = client.channels.cache.get(logChannelId);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] })
                    .catch(err => logger.error('Failed to send guild leave log:', err));
            }
        }
    }
}
