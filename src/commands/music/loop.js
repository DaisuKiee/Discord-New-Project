import Command from '../../structures/Command.js';

export default class LoopCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'loop',
            description: {
                content: 'Toggle loop mode',
                usage: 'loop [mode]',
                examples: ['loop', 'loop track', 'loop queue']
            },
            category: 'music',
            aliases: ['repeat'],
            cooldown: 3,
            args: false,
            permissions: {
                dev: false,
                client: ['SendMessages'],
                user: []
            },
            slashCommand: true,
            options: [
                {
                    name: 'mode',
                    description: 'Loop mode',
                    type: 3,
                    required: false,
                    choices: [
                        { name: 'Off', value: 'off' },
                        { name: 'Track', value: 'track' },
                        { name: 'Queue', value: 'queue' }
                    ]
                }
            ]
        });
    }

    async slashRun(interaction) {
        const player = interaction.client.music.getPlayer(interaction.guild.id);
        
        if (!player) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel!', ephemeral: true });
        }

        const mode = interaction.options.getString('mode') || 'track';

        if (mode === 'off') {
            player.setLoop(0);
            return interaction.reply('🔁 Loop disabled!');
        } else if (mode === 'track') {
            player.setLoop(1);
            return interaction.reply('🔂 Looping current track!');
        } else if (mode === 'queue') {
            player.setLoop(2);
            return interaction.reply('🔁 Looping queue!');
        }
    }
}
