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
            prefixCommand: true,
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

    async run(message, args) {
        const user = message.mentions.users.first() || message.author;
        const { createContainer, createButtonRow } = await import('../../utils/components.js');
        const { MessageFlags } = await import('discord.js');

        const container = createContainer([
            {
                title: `🖼️ ${user.tag}'s Avatar`,
                thumbnail: user.displayAvatarURL({ dynamic: true, size: 1024 }),
                separator: true
            },
            {
                description: `[Click here for full size](${user.displayAvatarURL({ dynamic: true, size: 4096 })})`
            }
        ]);

        const links = createButtonRow([
            { label: 'PNG', url: user.displayAvatarURL({ extension: 'png', size: 4096 }), emoji: '🖼️' },
            { label: 'JPG', url: user.displayAvatarURL({ extension: 'jpg', size: 4096 }), emoji: '📷' },
            { label: 'WEBP', url: user.displayAvatarURL({ extension: 'webp', size: 4096 }), emoji: '🎨' }
        ]);

        container.addActionRowComponents(links);

        return message.reply({ 
            components: [container],
            flags: MessageFlags.IsComponentsV2
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
