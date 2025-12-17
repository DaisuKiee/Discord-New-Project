import Command from '../../structures/Command.js';
import { EmbedBuilder } from 'discord.js';

export default class ImageCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'image',
            description: {
                content: 'Generate an image using AI',
                usage: 'image <prompt>',
                examples: ['image a cat in space', 'image sunset over mountains']
            },
            category: 'ai',
            aliases: ['generate', 'dalle'],
            cooldown: 30,
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
                    name: 'prompt',
                    description: 'What to generate',
                    type: 3,
                    required: true
                },
                {
                    name: 'size',
                    description: 'Image size',
                    type: 3,
                    required: false,
                    choices: [
                        { name: '1024x1024', value: '1024x1024' },
                        { name: '1792x1024', value: '1792x1024' },
                        { name: '1024x1792', value: '1024x1792' }
                    ]
                }
            ]
        });
    }

    async run(message, args) {
        const prompt = args.join(' ');
        if (!prompt) return message.reply('❌ Please provide a prompt!');

        const reply = await message.reply('🎨 Generating image...');

        try {
            const imageUrl = await message.client.ai.generateImage(prompt, { size: '1024x1024' });
            const { createContainer, createMediaGallery } = await import('../../utils/components.js');
            const { MessageFlags } = await import('discord.js');

            const container = createContainer([
                {
                    title: '🎨 AI Generated Image',
                    description: `**Prompt:** ${prompt}`,
                    separator: true
                },
                {
                    description: `[View Full Image](${imageUrl})`
                }
            ]);

            return reply.edit({ 
                content: null,
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            return reply.edit('❌ Failed to generate image.');
        }
    }

    async slashRun(interaction) {
        const prompt = interaction.options.getString('prompt');
        const size = interaction.options.getString('size') || '1024x1024';

        await interaction.deferReply();

        try {
            const imageUrl = await interaction.client.ai.generateImage(prompt, { size });

            const embed = new EmbedBuilder()
                .setColor(interaction.client.color.success)
                .setTitle('🎨 AI Generated Image')
                .setDescription(`**Prompt:** ${prompt}`)
                .setImage(imageUrl)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            interaction.client.logger.error('Image Generation Error:', error);
            return interaction.editReply('❌ Failed to generate image. Make sure OpenAI API key is configured.');
        }
    }
}
