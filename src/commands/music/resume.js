import Command from '../../structures/Command.js';

export default class ResumeCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'resume',
            description: {
                content: 'Resume the paused song',
                usage: 'resume',
                examples: ['resume']
            },
            category: 'music',
            aliases: ['unpause'],
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

        if (!player.isPaused) {
            return message.reply('❌ The music is not paused!');
        }

        await client.music.resume(message.guild.id);
        return message.reply('▶️ Resumed the music!');
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

        if (!player.isPaused) {
            return interaction.reply({ content: '❌ The music is not paused!', ephemeral: true });
        }

        await interaction.client.music.resume(interaction.guild.id);
        return interaction.reply('▶️ Resumed the music!');
    }
}
