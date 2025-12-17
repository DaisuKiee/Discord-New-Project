import Command from '../../structures/Command.js';

export default class ShuffleCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'shuffle',
            description: {
                content: 'Shuffle the queue',
                usage: 'shuffle',
                examples: ['shuffle']
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
        
        if (!player || !player.queue.length) {
            return message.reply('❌ Queue is empty!');
        }

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceChannel) {
            return message.reply('❌ You need to be in the same voice channel!');
        }

        // Shuffle queue
        for (let i = player.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [player.queue[i], player.queue[j]] = [player.queue[j], player.queue[i]];
        }

        return message.reply('🔀 Queue shuffled!');
    }

    async slashRun(interaction) {
        const player = interaction.client.music.getPlayer(interaction.guild.id);
        
        if (!player || !player.queue.length) {
            return interaction.reply({ content: '❌ Queue is empty!', ephemeral: true });
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel!', ephemeral: true });
        }

        // Shuffle queue
        for (let i = player.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [player.queue[i], player.queue[j]] = [player.queue[j], player.queue[i]];
        }

        return interaction.reply('🔀 Queue shuffled!');
    }
}
