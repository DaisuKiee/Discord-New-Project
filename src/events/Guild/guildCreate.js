import Event from '../../structures/Event.js';
import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';

export default class GuildCreate extends Event {
    constructor(...args) {
        super(...args, {
            name: 'guildCreate',
            once: false,
        });
    }

    async run(guild) {
        const client = this.client;
        const { config } = await import('../../config.js');
        const { logger } = await import('../../utils/logger.js');
        logger.success(`Joined new guild: ${guild.name} (${guild.id})`);

        // Get guild owner
        const owner = await guild.fetchOwner().catch(() => null);
        
        // Get invite link
        const inviteChannel = guild.channels.cache.find(
            c => c.type === 0 && c.permissionsFor(guild.members.me).has(['CreateInstantInvite', 'ViewChannel'])
        );
        let inviteLink = 'No invite available';
        if (inviteChannel) {
            try {
                const invite = await inviteChannel.createInvite({ maxAge: 0, maxUses: 0 });
                inviteLink = invite.url;
            } catch (error) {
                logger.error('Failed to create invite:', error);
            }
        }

        // Calculate bot percentage
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const botPercentage = ((botCount / guild.memberCount) * 100).toFixed(1);

        // Get verification level
        const verificationLevels = {
            0: 'None',
            1: 'Low',
            2: 'Medium',
            3: 'High',
            4: 'Very High'
        };

        // Get boost info
        const boostTier = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;

        // Create embed
        const embed = new EmbedBuilder()
            .setColor(0x57F287) // Green for join
            .setTitle('📥 Joined New Server')
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
                        `**Total:** ${guild.memberCount.toLocaleString()}`,
                        `**Humans:** ${(guild.memberCount - botCount).toLocaleString()}`,
                        `**Bots:** ${botCount} (${botPercentage}%)`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📊 Server Stats',
                    value: [
                        `**Channels:** ${guild.channels.cache.size}`,
                        `**Roles:** ${guild.roles.cache.size}`,
                        `**Emojis:** ${guild.emojis.cache.size}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🔒 Security',
                    value: [
                        `**Verification:** ${verificationLevels[guild.verificationLevel]}`,
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
                        `**Features:** ${guild.features.length || 0}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🌐 Other',
                    value: [
                        `**Locale:** ${guild.preferredLocale}`,
                        `**AFK Timeout:** ${guild.afkTimeout / 60}m`,
                        `**Vanity URL:** ${guild.vanityURLCode || 'None'}`
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

        // Create invite button
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Join Server')
                .setStyle(ButtonStyle.Link)
                .setURL(inviteLink)
                .setDisabled(inviteLink === 'No invite available')
        );

        // Send to log channel
        const logChannelId = config.logs?.guildJoin || config.logs?.channel;
        if (logChannelId) {
            const logChannel = client.channels.cache.get(logChannelId);
            if (logChannel) {
                await logChannel.send({ 
                    embeds: [embed],
                    components: inviteLink !== 'No invite available' ? [row] : []
                }).catch(err => logger.error('Failed to send guild join log:', err));
            }
        }

        // Send welcome message to the server
        const welcomeChannel = guild.systemChannel || guild.channels.cache.find(
            c => c.type === 0 && c.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])
        );

        if (welcomeChannel) {
            const welcomeEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`👋 Thanks for adding ${client.user.username}!`)
                .setDescription([
                    `Hello **${guild.name}**! I'm an all-in-one Discord bot with tons of features.`,
                    '',
                    '**🎯 Quick Start:**',
                    '• Use \`/help\` to see all commands',
                    '• Use \`/setup\` to configure the bot',
                    '• Visit our dashboard for advanced settings',
                    'this is just a BETA BOT music feature are usable',
                    '',
                    '**✨ Features:**',
                    '• 🎵 Music Player (YouTube, Spotify, SoundCloud)',
                    '• 🤖 AI Assistant (GPT-4, Claude, Gemini) BETA-STILL NOT WORKING',
                    '• 🛡️ Moderation Tools',
                    '• 🎫 Ticket System',
                    '• And much more!',
                    '',
                    'Need help? Join our support server or check the documentation!'
                ].join('\n'))
                .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
                .setFooter({ text: 'Use /help to get started' })
                .setTimestamp();

            await welcomeChannel.send({ embeds: [welcomeEmbed] }).catch(() => {});
        }
    }
};
