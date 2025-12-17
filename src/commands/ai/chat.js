import Command from '../../structures/Command.js';
import { EmbedBuilder } from 'discord.js';

export default class ChatCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'chat',
            description: {
                content: 'Chat with AI assistant',
                usage: 'chat <message>',
                examples: ['chat Hello!', 'chat Explain quantum physics']
            },
            category: 'ai',
            aliases: ['ai', 'ask'],
            cooldown: 5,
            args: true,
            permissions: {
                dev: false,
                client: ['SendMessages', 'EmbedLinks'],
                user: []
            },
            slashCommand: true,
            prefixCommand: true,
            options: [
                {
                    name: 'message',
                    description: 'Your message to the AI',
                    type: 3,
                    required: true
                },
                {
                    name: 'model',
                    description: 'AI model to use',
                    type: 3,
                    required: false,
                    choices: [
                        { name: 'GPT-3.5', value: 'gpt-3.5-turbo' },
                        { name: 'GPT-4', value: 'gpt-4' },
                        { name: 'Claude', value: 'claude-3-sonnet-20240229' },
                        { name: 'Gemini', value: 'gemini-pro' }
                    ]
                }
            ]
        });
    }

    async run(message, args) {
        const client = message.client;
        const query = args.join(' ');
        
        if (!query) return message.reply('❌ Please provide a message!');
        
        await message.channel.sendTyping();

        try {
            const response = await client.ai.chat(message.author.id, query, {
                channelId: message.channel.id,
                guildId: message.guild?.id
            });

            const { createContainer } = await import('../../utils/components.js');
            const { MessageFlags } = await import('discord.js');

            const container = createContainer([
                {
                    title: '🤖 AI Response',
                    thumbnail: message.author.displayAvatarURL(),
                    separator: true
                },
                {
                    description: response.content
                },
                {
                    separator: true
                },
                {
                    description: `📊 **Model:** ${response.provider} | **Tokens:** ${response.tokensUsed}`
                }
            ]);

            return message.reply({ 
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            client.logger.error('AI Chat Error:', error);
            return message.reply('❌ Failed to get AI response. Please try again later.');
        }
    }

    async slashRun(interaction, data) {
        const query = interaction.options.getString('message');
        const model = interaction.options.getString('model');

        await interaction.deferReply();

        try {
            const response = await interaction.client.ai.chat(interaction.user.id, query, {
                channelId: interaction.channel.id,
                guildId: interaction.guild?.id,
                model: model || undefined
            });

            const embed = new EmbedBuilder()
                .setColor(interaction.client.color.info)
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(response.content)
                .setFooter({ text: `Model: ${response.provider} | Tokens: ${response.tokensUsed}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            interaction.client.logger.error('AI Chat Error:', error);
            return interaction.editReply('❌ Failed to get AI response. Please try again later.');
        }
    }
}
