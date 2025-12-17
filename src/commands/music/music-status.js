import Command from '../../structures/Command.js';

export default class MusicStatusCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'music-status',
            description: {
                content: 'Check music system status',
                usage: 'music-status',
                examples: ['music-status']
            },
            category: 'music',
            cooldown: 3,
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
        const music = message.client.music;
        
        if (!music || !music.poru) {
            return message.reply('❌ Music service is not initialized');
        }

        const nodes = music.poru.nodes;
        const nodeCount = nodes ? nodes.size : 0;
        const isReady = music.isReady;
        
        let nodeStatus = 'No nodes configured';
        if (nodes && nodes.size > 0) {
            nodeStatus = Array.from(nodes.values()).map(node => {
                return `**${node.name}**: ${node.isConnected ? '✅ Connected' : '❌ Disconnected'}`;
            }).join('\n');
        }

        const { createContainer } = await import('../../utils/components.js');
        const { MessageFlags } = await import('discord.js');
        
        const container = createContainer([
            {
                title: '🎵 Music System Status',
                description: isReady ? '✅ System is operational' : '❌ System is not ready',
                separator: true
            },
            {
                description: `**System Ready:** ${isReady ? '✅ Yes' : '❌ No'}\n**Nodes:** ${nodeCount}\n**Active Players:** ${music.poru.players.size}`
            },
            {
                title: '🌐 Node Status',
                description: nodeStatus,
                separator: true
            }
        ]);

        return message.reply({ 
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }

    async slashRun(interaction) {
        const music = this.client.music;
        
        if (!music || !music.poru) {
            return interaction.reply({
                content: '❌ Music service is not initialized',
                ephemeral: true
            });
        }

        const nodes = music.poru.nodes;
        const nodeCount = nodes ? nodes.size : 0;
        const isReady = music.isReady;
        
        let nodeStatus = 'No nodes configured';
        if (nodes && nodes.size > 0) {
            nodeStatus = Array.from(nodes.values()).map(node => {
                return `**${node.name}**: ${node.isConnected ? '✅ Connected' : '❌ Disconnected'}`;
            }).join('\n');
        }

        // Use Components v2 Container
        const { createContainer } = await import('../../utils/components.js');
        
        const container = createContainer([
            {
                title: '🎵 Music System Status',
                description: isReady ? '✅ System is operational' : '❌ System is not ready',
                separator: true
            },
            {
                description: `**System Ready:** ${isReady ? '✅ Yes' : '❌ No'}\n**Nodes:** ${nodeCount}\n**Active Players:** ${music.poru.players.size}`
            },
            {
                title: '🌐 Node Status',
                description: nodeStatus,
                separator: true
            }
        ]);

        const { MessageFlags } = await import('discord.js');
        
        await interaction.reply({ 
            components: [container],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });
    }
}
