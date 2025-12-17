import Command from '../../structures/Command.js';

export default class SkipCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'skip',
            description: {
                content: 'Skip the current song',
                usage: 'skip',
                examples: ['skip']
            },
            category: 'music',
            aliases: ['s'],
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

        await client.music.skip(message.guild.id);
        return message.reply('⏭️ Skipped the current song!');
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

        await interaction.client.music.skip(interaction.guild.id);
        return interaction.reply('⏭️ Skipped the current song!');
    }
}
