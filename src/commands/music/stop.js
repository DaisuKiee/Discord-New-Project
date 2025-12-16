import Command from '../../structures/Command.js';

export default class StopCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'stop',
            description: {
                content: 'Stop the music and clear the queue',
                usage: 'stop',
                examples: ['stop']
            },
            category: 'music',
            aliases: ['disconnect', 'dc'],
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

    async run(client, message) {
        const player = client.music.getPlayer(message.guild.id);
        
        if (!player) {
            return message.reply('❌ Nothing is playing right now!');
        }

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceChannel) {
            return message.reply('❌ You need to be in the same voice channel!');
        }

        await client.music.stop(message.guild.id);
        return message.reply('⏹️ Stopped the music and cleared the queue!');
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

        await interaction.client.music.stop(interaction.guild.id);
        return interaction.reply('⏹️ Stopped the music and cleared the queue!');
    }
}
