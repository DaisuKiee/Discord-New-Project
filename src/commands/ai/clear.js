import Command from '../../structures/Command.js';

export default class ClearCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'clear-chat',
            description: {
                content: 'Clear your AI conversation history',
                usage: 'clear-chat',
                examples: ['clear-chat']
            },
            category: 'ai',
            aliases: ['reset-chat'],
            cooldown: 5,
            args: false,
            permissions: {
                dev: false,
                client: ['SendMessages'],
                user: []
            },
            slashCommand: true,
            options: []
        });
    }

    async slashRun(interaction) {
        try {
            await interaction.client.ai.clearConversation(
                interaction.user.id,
                interaction.channel.id
            );

            return interaction.reply({
                content: '✅ Your AI conversation history has been cleared!',
                ephemeral: true
            });
        } catch (error) {
            interaction.client.logger.error('Clear Chat Error:', error);
            return interaction.reply({
                content: '❌ Failed to clear conversation history.',
                ephemeral: true
            });
        }
    }
}
