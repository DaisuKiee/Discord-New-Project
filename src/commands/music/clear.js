import Command from '../../structures/Command.js';

export default class ClearQueueCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'clear-queue',
            description: {
                content: 'Clear the music queue',
                usage: 'clear-queue',
                examples: ['clear-queue']
            },
            category: 'music',
            aliases: ['clearqueue'],
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
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel!', ephemeral: true });
        }

        player.queue.clear();
        return interaction.reply('🗑️ Queue cleared!');
    }
}
