import Command from '../../structures/Command.js';

export default class AutoplayCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'autoplay',
            description: {
                content: 'Toggle autoplay mode (automatically plays related songs)',
                usage: 'autoplay',
                examples: ['autoplay']
            },
            category: 'music',
            aliases: ['ap'],
            cooldown: 3,
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
        const player = interaction.client.music.getPlayer(interaction.guild.id);
        
        if (!player) {
            return interaction.reply({ content: '❌ Nothing is playing right now!', ephemeral: true });
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceChannel) {
            return interaction.reply({ 
                content: '❌ You need to be in the same voice channel!', 
                ephemeral: true 
            });
        }

        // Toggle autoplay
        player.autoplay = !player.autoplay;

        const { createContainer } = await import('../../utils/components.js');
        const { MessageFlags } = await import('discord.js');

        const container = createContainer([
            {
                title: player.autoplay ? '✅ Autoplay Enabled' : '❌ Autoplay Disabled',
                description: player.autoplay 
                    ? 'The bot will automatically play related songs when the queue ends.'
                    : 'Autoplay has been disabled. The bot will stop when the queue ends.',
                separator: true
            },
            {
                description: `🎵 **Status:** ${player.autoplay ? 'ON' : 'OFF'}`
            }
        ]);

        return interaction.reply({ 
            components: [container],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });
    }
}
