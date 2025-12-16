import Command from '../../structures/Command.js';
import { PermissionFlagsBits } from 'discord.js';

export default class WarnCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'warn',
            description: {
                content: 'Warn a user',
                usage: 'warn <user> [reason]',
                examples: ['warn @user Spamming', 'warn @user']
            },
            category: 'moderation',
            aliases: [],
            cooldown: 3,
            args: true,
            permissions: {
                dev: false,
                client: ['SendMessages', 'EmbedLinks'],
                user: [PermissionFlagsBits.ModerateMembers]
            },
            slashCommand: true,
            options: [
                {
                    name: 'user',
                    description: 'User to warn',
                    type: 6,
                    required: true
                },
                {
                    name: 'reason',
                    description: 'Reason for warning',
                    type: 3,
                    required: false
                }
            ]
        });
    }

    async run(client, message, args) {
        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('❌ Please mention a user to warn!');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            const modCase = await client.moderation.warn(
                message.guild,
                user,
                message.author,
                reason
            );

            const embed = client.moderation.createCaseEmbed(modCase, user, message.author);
            
            await message.reply({ embeds: [embed] });
            
            try {
                await user.send({
                    embeds: [embed.setDescription(`You have been warned in **${message.guild.name}**`)]
                });
            } catch (e) {
                // User has DMs disabled
            }
        } catch (error) {
            client.logger.error('Warn Error:', error);
            return message.reply('❌ Failed to warn user.');
        }
    }

    async slashRun(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            const modCase = await interaction.client.moderation.warn(
                interaction.guild,
                user,
                interaction.user,
                reason
            );

            const embed = interaction.client.moderation.createCaseEmbed(modCase, user, interaction.user);
            
            await interaction.reply({ embeds: [embed] });
            
            try {
                await user.send({
                    embeds: [embed.setDescription(`You have been warned in **${interaction.guild.name}**`)]
                });
            } catch (e) {
                // User has DMs disabled
            }
        } catch (error) {
            interaction.client.logger.error('Warn Error:', error);
            return interaction.reply({ content: '❌ Failed to warn user.', ephemeral: true });
        }
    }
}
