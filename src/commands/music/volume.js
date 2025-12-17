import Command from '../../structures/Command.js';

export default class VolumeCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'volume',
            description: {
                content: 'Set the music volume',
                usage: 'volume <1-100>',
                examples: ['volume 50', 'volume 100']
            },
            category: 'music',
            aliases: ['vol'],
            cooldown: 3,
            args: true,
            permissions: {
                dev: false,
                client: ['SendMessages'],
                user: []
            },
            slashCommand: true,
            prefixCommand: true,
            options: [
                {
                    name: 'level',
                    description: 'Volume level (1-100)',
                    type: 4,
                    required: true,
                    minValue: 1,
                    maxValue: 100
                }
            ]
        });
    }

    async run(message, args) {
        const client = message.client;
        const player = client.music.getPlayer(message.guild.id);
        
        if (!player) {
            return message.reply('❌ Nothing is playing right now!');
        }

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceChannel) {
            return message.reply('❌ You need to be in the same voice channel!');
        }

        const volume = parseInt(args[0]);
        if (isNaN(volume) || volume < 1 || volume > 100) {
            return message.reply('❌ Please provide a valid volume between 1 and 100!');
        }

        await client.music.setVolume(message.guild.id, volume);
        return message.reply(`🔊 Volume set to **${volume}%**`);
    }

    async slashRun(interaction) {
        const player = interaction.client.music.getPlayer(interaction.guild.id);
        
        if (!player) {
            return interaction.reply({ content: '❌ Nothing is playing right now!', ephemeral: true });
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel!', ephemeral: true });
        }

        const volume = interaction.options.getInteger('level');
        await interaction.client.music.setVolume(interaction.guild.id, volume);
        return interaction.reply(`🔊 Volume set to **${volume}%**`);
    }
}
