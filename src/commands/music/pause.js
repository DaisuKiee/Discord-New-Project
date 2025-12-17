import Command from '../../structures/Command.js';

export default class PauseCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'pause',
            description: {
                content: 'Pause the current song',
                usage: 'pause',
                examples: ['pause']
            },
            category: 'music',
            aliases: [],
            cooldown: 3,
            args: false,
            permissions: {
                dev: false,
                client: ['SendMessages'],
                user: []
            },
            slashCommand: true,
            prefixCommand: true,
            options: []
        });
    }

    async run(message, args) {
        const client = message.client;
        const player = client.music.getPlayer(message.guild.id);
        
        if (!player || !player.currentTrack) {
            return message.reply('❌ Nothing is playing right now!');
        }

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceChannel) {
            return message.reply('❌ You need to be in the same voice channel!');
        }

        if (player.isPaused) {
            return message.reply('❌ The music is already paused!');
        }

        await client.music.pause(message.guild.id);
        return message.reply('⏸️ Paused the music!');
    }

    async slashRun(interaction) {
        const player = interaction.client.music.getPlayer(interaction.guild.id);
        
        if (!player || !player.currentTrack) {
            return interaction.reply({ content: '❌ Nothing is playing right now!', ephemeral: true });
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel!', ephemeral: true });
        }

        if (player.isPaused) {
            return interaction.reply({ content: '❌ The music is already paused!', ephemeral: true });
        }

        await interaction.client.music.pause(interaction.guild.id);
        return interaction.reply('⏸️ Paused the music!');
    }
}
