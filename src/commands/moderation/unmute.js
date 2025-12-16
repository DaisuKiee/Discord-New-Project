import Command from '../../structures/Command.js';
import { PermissionFlagsBits } from 'discord.js';

export default class UnmuteCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'unmute',
            description: {
                content: 'Remove timeout from a user',
                usage: 'unmute <user>',
                examples: ['unmute @user']
            },
            category: 'moderation',
            aliases: ['untimeout'],
            cooldown: 3,
            args: false,
            permissions: {
                dev: false,
                client: ['ModerateMembers'],
                user: [PermissionFlagsBits.ModerateMembers]
            },
            slashCommand: true,
            options: [
                {
                    name: 'user',
                    description: 'User to unmute',
                    type: 6,
                    required: true
                }
            ]
        });
    }

    async slashRun(interaction) {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (!member) {
            return interaction.reply({ content: '❌ User not found!', ephemeral: true });
        }

        if (!member.isCommunicationDisabled()) {
            return interaction.reply({ content: '❌ User is not muted!', ephemeral: true });
        }

        try {
            await member.timeout(null, `Unmuted by ${interaction.user.tag}`);
            return interaction.reply(`✅ ${user} has been unmuted!`);
        } catch (error) {
            return interaction.reply({ content: '❌ Failed to unmute user.', ephemeral: true });
        }
    }
}
