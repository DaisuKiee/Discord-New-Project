import Command from '../../structures/Command.js';

export default class QueueCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'queue',
            description: {
                content: 'Show the music queue',
                usage: 'queue',
                examples: ['queue']
            },
            category: 'music',
            aliases: ['q'],
            cooldown: 3,
            args: false,
            permissions: {
                dev: false,
                client: ['SendMessages', 'EmbedLinks'],
                user: []
            },
            slashCommand: true,
            options: []
        });
    }

    async run(client, message) {
        const player = client.music.getPlayer(message.guild.id);
        
        if (!player || !player.currentTrack) {
            return message.reply('❌ Nothing is playing right now!');
        }

        const current = player.currentTrack;
        const queue = player.queue;

        const embed = new EmbedBuilder()
            .setColor(client.color.info)
            .setTitle('🎵 Music Queue')
            .setDescription(`**Now Playing:**\n[${current.info.title}](${current.info.uri}) - \`${client.music.formatTime(current.info.length)}\``)
            .setThumbnail(current.info.artworkUrl || current.info.thumbnail)
            .addFields({
                name: 'Up Next',
                value: queue.slice(0, 10).map((song, i) => 
                    `${i + 1}. [${song.info.title}](${song.info.uri}) - \`${client.music.formatTime(song.info.length)}\``
                ).join('\n') || 'No songs in queue'
            })
            .setFooter({ text: `${queue.length} song(s) in queue | Volume: ${player.volume}%` });

        return message.reply({ embeds: [embed] });
    }

    async slashRun(interaction) {
        const player = interaction.client.music.getPlayer(interaction.guild.id);
        
        if (!player || !player.currentTrack) {
            return interaction.reply({ content: '❌ Nothing is playing right now!', ephemeral: true });
        }

        const current = player.currentTrack;
        const queue = player.queue;

        // Use Components v2 Container
        const { createContainer, createPaginationButtons } = await import('../../utils/components.js');
        
        const sections = [
            {
                title: '🎵 Music Queue',
                thumbnail: current.info.artworkUrl || current.info.thumbnail,
                separator: true
            },
            {
                title: '▶️ Now Playing',
                description: `**[${current.info.title}](${current.info.uri})**\nDuration: ${interaction.client.music.formatTime(current.info.length)}`,
                separator: true
            }
        ];

        if (queue.length > 0) {
            const queueList = queue.slice(0, 10).map((song, i) => 
                `**${i + 1}.** [${song.info.title}](${song.info.uri}) - \`${interaction.client.music.formatTime(song.info.length)}\``
            ).join('\n');

            sections.push({
                title: '📋 Up Next',
                description: queueList
            });
        } else {
            sections.push({
                description: '📭 No songs in queue'
            });
        }

        sections.push({
            separator: true
        }, {
            description: `📊 **Total:** ${queue.length} song(s) | 🔊 **Volume:** ${player.volume}%`
        });

        const container = createContainer(sections);
        const buttons = queue.length > 10 ? createPaginationButtons(1, Math.ceil(queue.length / 10)) : null;

        const { MessageFlags } = await import('discord.js');
        
        // Add pagination buttons to container if needed
        if (buttons) {
            container.addActionRowComponents(buttons);
        }
        
        return interaction.reply({ 
            components: [container],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });
    }
}
