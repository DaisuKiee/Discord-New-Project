import Command from '../../structures/Command.js';
import { PermissionFlagsBits } from 'discord.js';

export default class MuteCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'mute',
            description: {
                content: 'Timeout a user',
                usage: 'mute <user> <duration> [reason]',
                examples: ['mute @user 1h Spamming', 'mute @user 30m']
            },
            category: 'moderation',
            aliases: ['timeout'],
            cooldown: 3,
            args: false,
            permissions: {
                dev: false,
                client: ['ModerateMembers'],
                user: [PermissionFlagsBits.ModerateMembers]
            },
            slashCommand: true,
            prefixCommand: true,
            options: [
                {
                    name: 'user',
                    description: 'User to mute',
                    type: 6,
                    required: true
                },
                {
                    name: 'duration',
                    description: 'Mute duration (e.g., 1h, 30m, 7d)',
                    type: 3,
                    required: true
                },
                {
                    name: 'reason',
                    description: 'Reason for mute',
                    type: 3,
                    required: false
                }
            ]
        });
    }

    async run(message, args) {
        const client = message.client;
        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('❌ Please mention a user to mute!');
        }

        const durationStr = args[1] || '1h';
        const reason = args.slice(2).join(' ') || 'No reason provided';
        const duration = this.parseDuration(durationStr);

        if (!duration) {
            return message.reply('❌ Invalid duration! Use: 1h, 30m, 7d');
        }

        try {
            const modCase = await client.moderation.mute(message.guild, user, message.author, reason, duration);
            const embed = client.moderation.createCaseEmbed(modCase, user, message.author);
            return message.reply({ embeds: [embed] });
        } catch (error) {
            return message.reply('❌ Failed to mute user.');
        }
    }

    async slashRun(interaction) {
        const user = interaction.options.getUser('user');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (!member) {
            return interaction.reply({
                content: '❌ User not found in this server!',
                ephemeral: true
            });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ You cannot mute yourself!',
                ephemeral: true
            });
        }

        if (member.id === interaction.client.user.id) {
            return interaction.reply({
                content: '❌ I cannot mute myself!',
                ephemeral: true
            });
        }

        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({
                content: '❌ You cannot mute this user!',
                ephemeral: true
            });
        }

        if (!member.moderatable) {
            return interaction.reply({
                content: '❌ I cannot mute this user!',
                ephemeral: true
            });
        }

        const duration = this.parseDuration(durationStr);
        if (!duration || duration > 2419200000) { // Max 28 days
            return interaction.reply({
                content: '❌ Invalid duration! Use: 1h, 30m, 7d (max 28 days)',
                ephemeral: true
            });
        }

        try {
            const modCase = await interaction.client.moderation.mute(
                interaction.guild,
                user,
                interaction.user,
                reason,
                duration
            );

            const embed = interaction.client.moderation.createCaseEmbed(modCase, user, interaction.user);
            embed.addFields({
                name: 'Duration',
                value: durationStr,
                inline: true
            });

            await interaction.reply({ embeds: [embed] });

            try {
                await user.send({
                    embeds: [embed.setDescription(`You have been muted in **${interaction.guild.name}**`)]
                });
            } catch (e) {
                // User has DMs disabled
            }
        } catch (error) {
            interaction.client.logger.error('Mute Error:', error);
            return interaction.reply({
                content: '❌ Failed to mute user.',
                ephemeral: true
            });
        }
    }

    parseDuration(str) {
        const regex = /^(\d+)([smhd])$/;
        const match = str.match(regex);
        
        if (!match) return null;

        const value = parseInt(match[1]);
        const unit = match[2];

        const multipliers = {
            s: 1000,
            m: 60000,
            h: 3600000,
            d: 86400000
        };

        return value * multipliers[unit];
    }
}
