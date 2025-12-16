import Command from '../../structures/Command.js';
import { PermissionFlagsBits } from 'discord.js';

export default class UnbanCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'unban',
            description: {
                content: 'Unban a user',
                usage: 'unban <user_id>',
                examples: ['unban 123456789']
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
                    name: 'user_id',
                    description: 'User ID to unban',
                    type: 3,
                    required: true
                }
            ]
        });
    }

    async slashRun(interaction) {
        const userId = interaction.options.getString('user_id');

        try {
            await interaction.guild.members.unban(userId);
            return interaction.reply(`✅ User <@${userId}> has been unbanned!`);
        } catch (error) {
            return interaction.reply({ content: '❌ Failed to unban user. Make sure the ID is correct.', ephemeral: true });
        }
    }
}
