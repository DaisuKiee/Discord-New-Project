import Command from '../../structures/Command.js';
import { EmbedBuilder } from 'discord.js';

export default class AvatarCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'avatar',
            description: {
                content: 'Get user avatar',
                usage: 'avatar [@user]',
                examples: ['avatar', 'avatar @user']
            },
            category: 'utility',
            aliases: ['av', 'pfp'],
            cooldown: 3,
            args: false,
            permissions: {
                dev: false,
                client: ['SendMessages', 'EmbedLinks'],
                user: []
            },
            slashCommand: true,
            options: [
                {
                    name: 'user',
                    description: 'User to get avatar',
                    type: 6,
                    required: false
                }
            ]
        });
    }

    async slashRun(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const avatarURL = user.displayAvatarURL({ dynamic: true, size: 4096 });

        const embed = new EmbedBuilder()
            .setColor(interaction.client.color.info)
            .setTitle(`${user.tag}'s Avatar`)
            .setImage(avatarURL)
            .setTimestamp();

        // Add download links as buttons
        const { createButtonRow } = await import('../../utils/components.js');
        const links = createButtonRow([
            { label: 'PNG', url: user.displayAvatarURL({ extension: 'png', size: 4096 }), emoji: '🖼️' },
            { label: 'JPG', url: user.displayAvatarURL({ extension: 'jpg', size: 4096 }), emoji: '📷' },
            { label: 'WEBP', url: user.displayAvatarURL({ extension: 'webp', size: 4096 }), emoji: '🎨' }
        ]);

        return interaction.reply({ embeds: [embed], components: [links] });
    }
}
