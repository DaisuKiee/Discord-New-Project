import { Poru } from 'poru';
import { EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';

export class MusicService {
    constructor(client) {
        this.client = client;
        this.isReady = false;
        
        const poruOptions = {
            library: 'discord.js',
            defaultPlatform: 'ytsearch',
            reconnectTimeout: 30000,
            reconnectTries: 5
        };

        // Add Spotify if configured
        if (config.lavalink.spotify.clientID && config.lavalink.spotify.clientSecret) {
            poruOptions.spotify = {
                clientID: config.lavalink.spotify.clientID,
                clientSecret: config.lavalink.spotify.clientSecret
            };
        }

        this.poru = new Poru(client, config.lavalink.nodes, poruOptions);
        
        this.setupEvents();
        
        // Initialize Poru AFTER setting up events (MUST be called in ready event)
        this.poru.init(client);
    }

    setupEvents() {
        // Node events
        this.poru.on('nodeConnect', (node) => {
            logger.success(`Lavalink node ${node.name} connected`);
            logger.info(`Total nodes: ${this.poru.nodes.size}`);
            this.isReady = true;
        });

        this.poru.on('nodeDisconnect', (node) => {
            logger.warn(`Lavalink node ${node.name} disconnected`);
            // Check if any nodes are still connected
            if (this.poru.nodes.size === 0) {
                this.isReady = false;
            }
        });

        this.poru.on('nodeError', (node, error) => {
            logger.error(`Lavalink node ${node.name} error:`, error);
        });
        
        this.poru.on('nodeReconnect', (node) => {
            logger.info(`Lavalink node ${node.name} reconnecting...`);
        });

        // Track events
        this.poru.on('trackStart', async (player, track) => {
            const channel = this.client.channels.cache.get(player.textChannel);
            if (!channel) return;

            // Use Components v2 Container for Now Playing
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
                    description: `⏱️ **Duration:** ${this.formatTime(track.info.length)}\n👤 **Requested by:** <@${track.info.requester}>\n📊 **Queue:** ${player.queue.length} song(s)`
                }
            ]);

            const buttonRows = createMusicControls(player.isPaused, player.autoplay || false);
            
            // Add all button rows to container
            buttonRows.forEach(row => {
                container.addActionRowComponents(row);
            });

            channel.send({ 
                components: [container],
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
            }).catch(() => {});
        });

        this.poru.on('trackEnd', async (player, track) => {
            // Auto-play or queue management can be added here
        });

        this.poru.on('queueEnd', async (player) => {
            const channel = this.client.channels.cache.get(player.textChannel);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setColor(parseInt(config.color.info.replace('#', ''), 16))
                .setDescription('✅ Queue finished! Add more songs or I\'ll leave in 5 minutes.')
                .setTimestamp();

            channel.send({ embeds: [embed] }).catch(() => {});

            // Auto-disconnect after 5 minutes of inactivity
            setTimeout(() => {
                if (player.queue.length === 0 && !player.isPlaying) {
                    player.destroy();
                    channel.send('👋 Left due to inactivity.').catch(() => {});
                }
            }, 300000);
        });

        this.poru.on('playerDisconnect', async (player) => {
            const channel = this.client.channels.cache.get(player.textChannel);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor(parseInt(config.color.warn.replace('#', ''), 16))
                    .setDescription('👋 Disconnected from voice channel')
                    .setTimestamp();

                channel.send({ embeds: [embed] }).catch(() => {});
            }
        });

        this.poru.on('playerError', (player, error) => {
            logger.error('Player error:', error);
            const channel = this.client.channels.cache.get(player.textChannel);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor(parseInt(config.color.error.replace('#', ''), 16))
                    .setDescription(`❌ An error occurred: ${error.message}`)
                    .setTimestamp();

                channel.send({ embeds: [embed] }).catch(() => {});
            }
        });

        this.poru.on('trackError', (player, track, error) => {
            logger.error('Track error:', error);
            const channel = this.client.channels.cache.get(player.textChannel);
            
            // Auto-skip to next track if available
            if (player.queue.length > 0) {
                logger.info('Skipping failed track, playing next...');
                player.stop();
            } else {
                // No more tracks, notify and destroy player
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setColor(parseInt(config.color.error.replace('#', ''), 16))
                        .setDescription(`❌ Failed to play: **${track.info.title}**\n\nReason: ${error.exception?.message || 'Unknown error'}\n\n*Tip: Try using YouTube links instead of Spotify for better reliability*`)
                        .setTimestamp();

                    channel.send({ embeds: [embed] }).catch(() => {});
                }
                player.destroy();
            }
        });
    }

    async play(interaction, query) {
        // Check if Lavalink is ready
        if (!this.isReady) {
            return interaction.reply({ 
                content: '❌ Music system is not ready yet. Lavalink is still connecting...', 
                ephemeral: true 
            });
        }
        
        // Double check nodes are available
        if (!this.poru.nodes || this.poru.nodes.size === 0) {
            return interaction.reply({ 
                content: '❌ No Lavalink nodes available. Please contact the bot administrator.', 
                ephemeral: true 
            });
        }

        const member = interaction.guild.members.cache.get(interaction.user.id);
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ 
                content: '❌ You need to be in a voice channel!', 
                ephemeral: true 
            });
        }

        const permissions = voiceChannel.permissionsFor(this.client.user);
        if (!permissions.has(['Connect', 'Speak'])) {
            return interaction.reply({ 
                content: '❌ I need permissions to join and speak in your voice channel!', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        try {
            // Get or create player
            let player = this.poru.players.get(interaction.guild.id);
            
            if (!player) {
                player = this.poru.createConnection({
                    guildId: interaction.guild.id,
                    voiceChannel: voiceChannel.id,
                    textChannel: interaction.channel.id,
                    deaf: true,
                    mute: false
                });
            }

            // Resolve track - Poru v5 API
            const resolve = await this.poru.resolve({ query, requester: interaction.user });

            if (!resolve || !resolve.tracks || resolve.tracks.length === 0) {
                return interaction.editReply('❌ No results found!');
            }

            const { loadType, tracks, playlistInfo } = resolve;

            if (loadType === 'PLAYLIST_LOADED' || loadType === 'playlist') {
                for (const track of tracks) {
                    track.info.requester = interaction.user.id;
                    player.queue.add(track);
                }

                // Use Components v2 Container for playlist
                const { createContainer } = await import('../../utils/components.js');
                const { MessageFlags } = await import('discord.js');

                const container = createContainer([
                    {
                        title: '✅ Playlist Added',
                        description: `**${playlistInfo?.name || 'Unknown'}**\n${tracks.length} songs added to queue`,
                        separator: true
                    },
                    {
                        description: `📊 **Queue Position:** ${player.queue.length - tracks.length + 1} - ${player.queue.length}`
                    }
                ]);

                await interaction.editReply({ 
                    components: [container],
                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
                });
            } else {
                const track = tracks[0];
                track.info.requester = interaction.user.id;
                player.queue.add(track);

                // Use Components v2 Container for single track
                const { createContainer } = await import('../../utils/components.js');
                const { MessageFlags } = await import('discord.js');

                const container = createContainer([
                    {
                        title: '✅ Added to Queue',
                        description: `**[${track.info.title}](${track.info.uri})**`,
                        thumbnail: track.info.artworkUrl || track.info.thumbnail,
                        separator: true
                    },
                    {
                        description: `⏱️ **Duration:** ${this.formatTime(track.info.length)}\n📊 **Position in Queue:** ${player.queue.length}`
                    }
                ]);

                await interaction.editReply({ 
                    components: [container],
                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
                });
            }

            // Start playing if not already
            if (!player.isPlaying && !player.isPaused) {
                player.play();
            }

        } catch (error) {
            logger.error('Play error:', error);
            return interaction.editReply('❌ An error occurred while trying to play the song.');
        }
    }

    getSource(query) {
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            return 'youtube';
        } else if (query.includes('spotify.com')) {
            return 'spotify';
        } else if (query.includes('soundcloud.com')) {
            return 'soundcloud';
        }
        return 'ytsearch'; // Default to YouTube search
    }

    formatTime(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    getPlayer(guildId) {
        return this.poru.players.get(guildId);
    }

    async stop(guildId) {
        const player = this.getPlayer(guildId);
        if (player) {
            player.destroy();
            return true;
        }
        return false;
    }

    async skip(guildId) {
        const player = this.getPlayer(guildId);
        if (player) {
            player.stop();
            return true;
        }
        return false;
    }

    async pause(guildId) {
        const player = this.getPlayer(guildId);
        if (player && !player.isPaused) {
            player.pause(true);
            return true;
        }
        return false;
    }

    async resume(guildId) {
        const player = this.getPlayer(guildId);
        if (player && player.isPaused) {
            player.pause(false);
            return true;
        }
        return false;
    }

    async setVolume(guildId, volume) {
        const player = this.getPlayer(guildId);
        if (player) {
            player.setVolume(volume);
            return true;
        }
        return false;
    }

    async seek(guildId, position) {
        const player = this.getPlayer(guildId);
        if (player && player.currentTrack) {
            player.seekTo(position);
            return true;
        }
        return false;
    }
}
