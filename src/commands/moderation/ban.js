import Command from '../../structures/Command.js';
import { PermissionFlagsBits } from 'discord.js';

export default class BanCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'ban',
            description: {
                content: 'Ban a user from the server',
                usage: 'ban <user> [reason] [duration]',
                examples: ['ban @user Raiding', 'ban @user Spam 7d']
            },
            category: 'moderation',
            aliases: [],
            cooldown: 3,
            args: false,
            permissions: {
                dev: false,
                client: ['BanMembers'],
                user: [PermissionFlagsBits.BanMembers]
            },
            slashCommand: true,
            options: [
                {
                    name: 'user',
                    description: 'User to ban',
                    type: 6,
                    required: true
                },
                {
                    name: 'reason',
                    description: 'Reason for ban',
                    type: 3,
                    required: false
                },
                {
                    name: 'duration',
                    description: 'Ban duration (e.g., 7d, 30d) - leave empty for permanent',
                    type: 3,
                    required: false
                }
            ]
        });
    }

    async slashRun(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const durationStr = interaction.options.getString('duration');

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (member) {
            if (member.id === interaction.user.id) {
                return interaction.reply({
                    content: '❌ You cannot ban yourself!',
                    ephemeral: true
                });
            }

            if (member.id === interaction.client.user.id) {
                return interaction.reply({
                    content: '❌ I cannot ban myself!',
                    ephemeral: true
                });
            }

            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    content: '❌ You cannot ban this user!',
                    ephemeral: true
                });
            }

            if (!member.bannable) {
                return interaction.reply({
                    content: '❌ I cannot ban this user!',
                    ephemeral: true
                });
            }
        }

        let duration = null;
        if (durationStr) {
            duration = this.parseDuration(durationStr);
            if (!duration) {
                return interaction.reply({
                    content: '❌ Invalid duration format! Use: 1h, 7d, 30d, etc.',
                    ephemeral: true
                });
            }
        }

        try {
            const modCase = await interaction.client.moderation.ban(
                interaction.guild,
                user,
                interaction.user,
                reason,
                duration
            );

            const embed = interaction.client.moderation.createCaseEmbed(modCase, user, interaction.user);
            
            if (duration) {
                embed.addFields({
                    name: 'Duration',
                    value: durationStr,
                    inline: true
                });
            }

            await interaction.reply({ embeds: [embed] });

            try {
                await user.send({
                    embeds: [embed.setDescription(`You have been banned from **${interaction.guild.name}**`)]
                });
            } catch (e) {
                // User has DMs disabled
            }
        } catch (error) {
            interaction.client.logger.error('Ban Error:', error);
            return interaction.reply({
                content: '❌ Failed to ban user.',
                ephemeral: true
            });
        }
    }

    parseDuration(str) {
        const regex = /^(\d+)([smhdw])$/;
        const match = str.match(regex);
        
        if (!match) return null;

        const value = parseInt(match[1]);
        const unit = match[2];

        const multipliers = {
            s: 1000,
            m: 60000,
            h: 3600000,
            d: 86400000,
            w: 604800000
        };

        return value * multipliers[unit];
    }
}
