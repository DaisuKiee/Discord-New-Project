import Command from '../../structures/Command.js';

export default class PlayCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'play',
            description: {
                content: 'Play music from YouTube, Spotify, SoundCloud, and more',
                usage: 'play <song name or URL> [engine]',
                examples: ['play Despacito', 'play Never Gonna Give You Up engine:YouTube', 'play https://youtube.com/watch?v=...']
            },
            category: 'music',
            aliases: ['p'],
            cooldown: 3,
            args: true,
            permissions: {
                dev: false,
                client: ['SendMessages', 'Connect', 'Speak'],
                user: []
            },
            slashCommand: true,
            options: [
                {
                    name: 'query',
                    description: 'Song name or URL',
                    type: 3,
                    required: true
                }
            ]
        });
    }

    async run(client, message, args) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ You need to be in a voice channel!');
        }

        const query = args.join(' ');
        
        // Create a fake interaction object for compatibility
        const fakeInteraction = {
            guild: message.guild,
            user: message.author,
            channel: message.channel,
            deferReply: async () => {},
            editReply: async (content) => message.reply(content),
            reply: async (content) => message.reply(content)
        };

        await client.music.play(fakeInteraction, query);
    }

    async slashRun(interaction) {
        const query = interaction.options.getString('query');
        await interaction.client.music.play(interaction, query);
    }
}
