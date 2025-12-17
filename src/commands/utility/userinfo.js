import Command from '../../structures/Command.js';
import { EmbedBuilder } from 'discord.js';

export default class UserInfoCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'userinfo',
            description: {
                content: 'Get information about a user',
                usage: 'userinfo [@user]',
                examples: ['userinfo', 'userinfo @user']
            },
            category: 'utility',
            aliases: ['user', 'whois'],
            cooldown: 3,
            args: false,
            permissions: {
                dev: false,
                client: ['SendMessages', 'EmbedLinks'],
                user: []
            },
            slashCommand: true,
            prefixCommand: true,
            options: [
                {
                    name: 'user',
                    description: 'User to check',
                    type: 6,
                    required: false
                }
            ]
        });
    }

    async run(message, args) {
        const user = message.mentions.users.first() || message.author;
        const member = await message.guild.members.fetch(user.id).catch(() => null);
        const { createContainer } = await import('../../utils/components.js');
        const { MessageFlags } = await import('discord.js');

        const sections = [
            {
                title: `👤 ${user.tag}`,
                thumbnail: user.displayAvatarURL({ dynamic: true, size: 1024 }),
                separator: true
            },
            {
                title: '📋 Account Info',
                description: `🆔 **ID:** ${user.id}\n📅 **Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>\n🤖 **Bot:** ${user.bot ? 'Yes' : 'No'}`
            }
        ];

        if (member) {
            sections.push({
                separator: true
            }, {
                title: '🏠 Server Info',
                description: `📥 **Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n🎭 **Roles:** ${member.roles.cache.size}\n🎨 **Highest Role:** ${member.roles.highest}`
            });
        }

        const container = createContainer(sections);
        return message.reply({ 
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }

    async slashRun(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        const embed = new EmbedBuilder()
            .setColor(interaction.client.color.info)
            .setTitle(`👤 ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: '🆔 ID', value: user.id, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true }
            );

        if (member) {
            embed.addFields(
                { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🎭 Roles', value: member.roles.cache.size.toString(), inline: true },
                { name: '🎨 Highest Role', value: member.roles.highest.toString(), inline: true }
            );

            if (member.premiumSince) {
                embed.addFields({
                    name: '💎 Boosting Since',
                    value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`,
                    inline: true
                });
            }
        }

        return interaction.reply({ embeds: [embed] });
    }
}
