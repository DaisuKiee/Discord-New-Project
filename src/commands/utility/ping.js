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
            options: []
        });
    }

    async slashRun(interaction) {
        const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
        
        const embed = new EmbedBuilder()
            .setColor(interaction.client.color.success)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: '📡 Latency', value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`, inline: true },
                { name: '💓 API Latency', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true }
            )
            .setTimestamp();

        return interaction.editReply({ content: null, embeds: [embed] });
    }
}
