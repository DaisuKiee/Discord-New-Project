import Command from '../../structures/Command.js';
import { EmbedBuilder } from 'discord.js';

export default class PingCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'ping',
            description: {
                content: 'Check bot latency',
                usage: 'ping',
                examples: ['ping']
            },
            category: 'utility',
            aliases: ['latency'],
            cooldown: 3,
            args: false,
            permissions: {
                dev: false,
                client: ['SendMessages', 'EmbedLinks'],
                user: []
            },
            slashCommand: true,
            prefixCommand: true,
            options: []
        });
    }

    async run(message, args) {
        const sent = await message.reply({ content: '🏓 Pinging...' });
        const latency = sent.createdTimestamp - message.createdTimestamp;
        
        const { createContainer } = await import('../../utils/components.js');
        const { MessageFlags } = await import('discord.js');

        const container = createContainer([
            {
                title: '🏓 Pong!',
                separator: true
            },
            {
                description: `📡 **Latency:** ${latency}ms\n💓 **API Latency:** ${Math.round(message.client.ws.ping)}ms`
            }
        ]);

        return sent.edit({ 
            content: null, 
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }

    async slashRun(interaction) {
        const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        
        const { createContainer } = await import('../../utils/components.js');
        const { MessageFlags } = await import('discord.js');

        const container = createContainer([
            {
                title: '🏓 Pong!',
                separator: true
            },
            {
                description: `📡 **Latency:** ${latency}ms\n💓 **API Latency:** ${Math.round(interaction.client.ws.ping)}ms`
            }
        ]);

        return interaction.editReply({ 
            content: null, 
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
}
