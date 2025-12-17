import Command from '../../structures/Command.js';
import { PermissionFlagsBits } from 'discord.js';

export default class KickCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'kick',
            description: {
                content: 'Kick a user from the server',
                usage: 'kick <user> [reason]',
                examples: ['kick @user Spamming']
            },
            category: 'moderation',
            aliases: [],
            cooldown: 3,
            args: false,
            permissions: {
                dev: false,
                client: ['KickMembers'],
                user: [PermissionFlagsBits.KickMembers]
            },
            slashCommand: true,
            prefixCommand: true,
            options: [
                {
                    name: 'user',
                    description: 'User to kick',
                    type: 6,
                    required: true
                },
                {
                    name: 'reason',
                    description: 'Reason for kick',
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
            return message.reply('❌ Please mention a user to kick!');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';
        const member = await message.guild.members.fetch(user.id).catch(() => null);
        
        if (!member) return message.reply('❌ User not found!');
        if (!member.kickable) return message.reply('❌ I cannot kick this user!');

        try {
            const modCase = await client.moderation.kick(message.guild, user, message.author, reason);
            const embed = client.moderation.createCaseEmbed(modCase, user, message.author);
            return message.reply({ embeds: [embed] });
        } catch (error) {
            return message.reply('❌ Failed to kick user.');
        }
    }

    async slashRun(interaction) {
        const user = interaction.options.getUser('user');
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
                content: '❌ You cannot kick yourself!',
                ephemeral: true
            });
        }

        if (member.id === interaction.client.user.id) {
            return interaction.reply({
                content: '❌ I cannot kick myself!',
                ephemeral: true
            });
        }

        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({
                content: '❌ You cannot kick this user!',
                ephemeral: true
            });
        }

        if (!member.kickable) {
            return interaction.reply({
                content: '❌ I cannot kick this user!',
                ephemeral: true
            });
        }

        try {
            const modCase = await interaction.client.moderation.kick(
                interaction.guild,
                user,
                interaction.user,
                reason
            );

            const embed = interaction.client.moderation.createCaseEmbed(modCase, user, interaction.user);
            
            await interaction.reply({ embeds: [embed] });

            try {
                await user.send({
                    embeds: [embed.setDescription(`You have been kicked from **${interaction.guild.name}**`)]
                });
            } catch (e) {
                // User has DMs disabled
            }
        } catch (error) {
            interaction.client.logger.error('Kick Error:', error);
            return interaction.reply({
                content: '❌ Failed to kick user.',
                ephemeral: true
            });
        }
    }
}
