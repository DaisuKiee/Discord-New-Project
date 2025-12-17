import Command from '../../structures/Command.js';

export default class NowPlayingCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'nowplaying',
            description: {
                content: 'Show the currently playing song',
                usage: 'nowplaying',
                examples: ['nowplaying']
            },
            category: 'music',
            aliases: ['np', 'current'],
            cooldown: 3,
            args: false,
            permissions: {
                dev: false,
                client: ['SendMessages', 'EmbedLinks'],
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

        const track = player.currentTrack;
        const position = player.position;
        const duration = track.info.length;
        
        const progress = Math.floor((position / duration) * 20);
        const progressBar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(20 - progress);

        const { createContainer, createMusicControls } = await import('../../utils/components.js');
        const { MessageFlags } = await import('discord.js');
        
        const container = createContainer([
            {
                title: '🎵 Now Playing',
                description: `**[${track.info.title}](${track.info.uri})**\nby ${track.info.author || 'Unknown'}`,
                thumbnail: track.info.artworkUrl || track.info.thumbnail,
                separator: true
            },
            {
                description: `👤 **Requested by:** <@${track.info.requester}>\n⏱️ **Duration:** ${client.music.formatTime(duration)}\n🔊 **Volume:** ${player.volume}%\n⏯️ **Status:** ${player.isPaused ? 'Paused ⏸️' : 'Playing ▶️'}\n🔁 **Loop:** ${player.loop || 'Off'}`
            },
            {
                description: `**Progress:**\n${progressBar}\n${client.music.formatTime(position)} / ${client.music.formatTime(duration)}`,
                separator: true
            },
            {
                description: `📊 **Queue:** ${player.queue.length} song(s) remaining`
            }
        ]);

        const buttons = createMusicControls(player.isPaused, player.autoplay || false);
        buttons.forEach(row => container.addActionRowComponents(row));
        
        return message.reply({ 
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }

    async slashRun(interaction) {
        const player = interaction.client.music.getPlayer(interaction.guild.id);
        
        if (!player || !player.currentTrack) {
            return interaction.reply({ content: '❌ Nothing is playing right now!', ephemeral: true });
        }

        const track = player.currentTrack;
        const position = player.position;
        const duration = track.info.length;
        
        const progress = Math.floor((position / duration) * 20);
        const progressBar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(20 - progress);

        // Use Components v2 Container
        const { createContainer, createMusicControls, createSeparator } = await import('../../utils/components.js');
        
        const container = createContainer([
            {
                title: '🎵 Now Playing',
                description: `**[${track.info.title}](${track.info.uri})**\nby ${track.info.author || 'Unknown'}`,
                thumbnail: track.info.artworkUrl || track.info.thumbnail,
                separator: true
            },
            {
                description: `👤 **Requested by:** <@${track.info.requester}>\n⏱️ **Duration:** ${interaction.client.music.formatTime(duration)}\n🔊 **Volume:** ${player.volume}%\n⏯️ **Status:** ${player.isPaused ? 'Paused ⏸️' : 'Playing ▶️'}\n🔁 **Loop:** ${player.loop || 'Off'}`
            },
            {
                description: `**Progress:**\n${progressBar}\n${interaction.client.music.formatTime(position)} / ${interaction.client.music.formatTime(duration)}`,
                separator: true
            },
            {
                description: `📊 **Queue:** ${player.queue.length} song(s) remaining`
            }
        ]);

        const buttons = createMusicControls(player.isPaused, player.autoplay || false);

        const { MessageFlags } = await import('discord.js');
        
        // Add all button rows to container
        buttons.forEach(row => {
            container.addActionRowComponents(row);
        });
        
        return interaction.reply({ 
            components: [container],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });
    }
}
