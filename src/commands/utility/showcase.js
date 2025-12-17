import Command from '../../structures/Command.js';
import { EmbedBuilder } from 'discord.js';

export default class ShowcaseCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'showcase',
            description: {
                content: 'Showcase Discord.js v14 Components v2',
                usage: 'showcase [type]',
                examples: ['showcase', 'showcase container', 'showcase gallery']
            },
            category: 'utility',
            aliases: ['demo'],
            cooldown: 5,
            permissions: {
                dev: false,
                client: ['SendMessages', 'EmbedLinks'],
                user: []
            },
            slashCommand: true,
            prefixCommand: true,
            options: [
                {
                    name: 'type',
                    description: 'Type of showcase',
                    type: 3,
                    required: false,
                    choices: [
                        { name: 'Container & Sections', value: 'container' },
                        { name: 'Media Gallery', value: 'gallery' },
                        { name: 'Text Displays', value: 'text' },
                        { name: 'All Components', value: 'all' }
                    ]
                }
            ]
        });
    }

    async run(message, args) {
        const { EmbedBuilder } = await import('discord.js');
        const embed = new EmbedBuilder()
            .setColor(message.client.color.info)
            .setTitle('🎨 Components Showcase')
            .setDescription('Use `/showcase` slash command to see interactive component demos!');
        return message.reply({ embeds: [embed] });
    }

    async slashRun(interaction) {
        const type = interaction.options.getString('type') || 'all';

        switch (type) {
            case 'container':
                await this.showContainer(interaction);
                break;
            case 'gallery':
                await this.showGallery(interaction);
                break;
            case 'text':
                await this.showText(interaction);
                break;
            default:
                await this.showAll(interaction);
        }
    }

    async showContainer(interaction) {
        const { createContainer, createButtonRow } = await import('../../utils/components.js');
        
        const container = createContainer([
            {
                title: '🎨 Container Component',
                description: 'This is a container with multiple sections!',
                separator: true
            },
            {
                title: 'Section 1',
                description: 'Containers can have multiple sections with titles and descriptions.',
                thumbnail: interaction.user.displayAvatarURL(),
                separator: true
            },
            {
                title: 'Section 2',
                description: 'Each section can have its own content and styling.'
            }
        ]);

        const buttons = createButtonRow([
            { customId: 'demo_1', label: 'Button 1', emoji: '1️⃣', style: 1 },
            { customId: 'demo_2', label: 'Button 2', emoji: '2️⃣', style: 2 },
            { customId: 'demo_3', label: 'Button 3', emoji: '3️⃣', style: 3 }
        ]);

        await interaction.reply({
            content: '**Container Showcase**',
            components: [container, buttons]
        });
    }

    async showGallery(interaction) {
        const { createMediaGallery, createButtonRow } = await import('../../utils/components.js');
        
        const gallery = createMediaGallery([
            {
                url: 'https://cdn.discordapp.com/attachments/example1.png',
                description: 'Image 1'
            },
            {
                url: 'https://cdn.discordapp.com/attachments/example2.png',
                description: 'Image 2'
            },
            {
                url: 'https://cdn.discordapp.com/attachments/example3.png',
                description: 'Image 3'
            }
        ]);

        const buttons = createButtonRow([
            { customId: 'gallery_prev', label: 'Previous', emoji: '◀️', style: 2 },
            { customId: 'gallery_next', label: 'Next', emoji: '▶️', style: 1 }
        ]);

        await interaction.reply({
            content: '**Media Gallery Showcase**',
            components: [gallery, buttons]
        });
    }

    async showText(interaction) {
        const { createTextDisplay, createSeparator } = await import('../../utils/components.js');
        
        const heading = createTextDisplay('📝 Text Display Components', 'heading');
        const separator = createSeparator('medium');
        const body = createTextDisplay('This is body text with normal styling.', 'body');
        const caption = createTextDisplay('This is caption text - smaller and subtle.', 'caption');

        await interaction.reply({
            content: '**Text Display Showcase**',
            components: [heading, separator, body, caption]
        });
    }

    async showAll(interaction) {
        const embed = new EmbedBuilder()
            .setColor(interaction.client.color.info)
            .setTitle('🎨 Discord.js v14 Components v2 Showcase')
            .setDescription('This bot uses the latest Components v2 API!')
            .addFields(
                { name: '🎯 Buttons', value: 'Interactive buttons with styles and emojis', inline: true },
                { name: '📋 Select Menus', value: 'Dropdown menus for selections', inline: true },
                { name: '📦 Containers', value: 'Organized content in sections', inline: true },
                { name: '🖼️ Media Gallery', value: 'Display multiple images', inline: true },
                { name: '📝 Text Displays', value: 'Styled text components', inline: true },
                { name: '➖ Separators', value: 'Visual spacing elements', inline: true }
            )
            .setFooter({ text: 'Use /showcase [type] to see specific examples' })
            .setTimestamp();

        const { createButtonRow } = await import('../../utils/components.js');
        const buttons = createButtonRow([
            { customId: 'show_container', label: 'Container', emoji: '📦', style: 1 },
            { customId: 'show_gallery', label: 'Gallery', emoji: '🖼️', style: 1 },
            { customId: 'show_text', label: 'Text', emoji: '📝', style: 1 }
        ]);

        await interaction.reply({
            embeds: [embed],
            components: [buttons]
        });
    }
}
