import Event from '../../structures/Event.js';
import { 
    InteractionType, 
    ComponentType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} from 'discord.js';

export default class InteractionCreate extends Event {
    constructor(...args) {
        super(...args, {
            name: 'interactionCreate',
            once: false,
        });
    }

    async run(interaction) {
        const client = interaction.client;

        // Handle Slash Commands
        if (interaction.type === InteractionType.ApplicationCommand) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            // Permission checks
            if (command.permissions.user.length > 0) {
                const missingPerms = interaction.member.permissions.missing(command.permissions.user);
                if (missingPerms.length > 0) {
                    return interaction.reply({
                        content: `❌ You need the following permissions: ${missingPerms.join(', ')}`,
                        ephemeral: true
                    });
                }
            }

            if (command.permissions.client.length > 0) {
                const missingPerms = interaction.guild.members.me.permissions.missing(command.permissions.client);
                if (missingPerms.length > 0) {
                    return interaction.reply({
                        content: `❌ I need the following permissions: ${missingPerms.join(', ')}`,
                        ephemeral: true
                    });
                }
            }

            // Cooldown
            if (!client.cooldowns.has(command.name)) {
                client.cooldowns.set(command.name, new Map());
            }

            const now = Date.now();
            const timestamps = client.cooldowns.get(command.name);
            const cooldownAmount = (command.cooldown || 3) * 1000;

            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return interaction.reply({
                        content: `⏱️ Please wait ${timeLeft.toFixed(1)} more seconds before using \`${command.name}\` again.`,
                        ephemeral: true
                    });
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

            // Check if module is enabled
            const { checkModuleEnabled } = await import('../../middleware/moduleCheck.js');
            const moduleEnabled = await checkModuleEnabled(interaction);
            
            if (!moduleEnabled) {
                const embed = new EmbedBuilder()
                    .setColor(client.color.warn)
                    .setTitle('🔒 Module Disabled')
                    .setDescription(`The **${command.category}** module is disabled on this server.\n\nServer administrators can enable it via the [Dashboard](${client.config.dashboard.url})`);
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Log command usage
            this.logCommandUsage(interaction, command);

            // Execute command
            try {
                await command.slashRun(interaction);
            } catch (error) {
                client.logger.error(`Slash Command Error [${command.name}]:`, error);
                
                const errorMessage = {
                    content: '❌ An error occurred while executing this command.',
                    ephemeral: true
                };

                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(errorMessage).catch(() => {});
                } else {
                    await interaction.reply(errorMessage).catch(() => {});
                }
            }
        }

        // Handle Button Interactions (Components v2)
        if (interaction.type === InteractionType.MessageComponent) {
            if (interaction.componentType === ComponentType.Button) {
                await this.handleButton(interaction);
            }
            
            // Handle Select Menus (Components v2)
            if (interaction.componentType === ComponentType.StringSelect) {
                await this.handleSelectMenu(interaction);
            }
        }

        // Handle Modal Submissions
        if (interaction.type === InteractionType.ModalSubmit) {
            await this.handleModal(interaction);
        }
    }

    async handleButton(interaction) {
        const client = interaction.client;
        const customId = interaction.customId;

        try {
            // Ticket System Buttons
            if (customId === 'ticket_close') {
                const ticketId = parseInt(interaction.channel.topic?.match(/Ticket #(\d+)/)?.[1]);
                
                if (!ticketId) {
                    return interaction.reply({ content: '❌ Invalid ticket channel!', ephemeral: true });
                }

                await interaction.deferReply();

                const ticket = await client.tickets.closeTicket(
                    ticketId,
                    interaction.guild.id,
                    interaction.user.tag
                );

                if (ticket) {
                    const embed = new EmbedBuilder()
                        .setColor(client.color.success)
                        .setTitle('🔒 Ticket Closed')
                        .setDescription(`Ticket #${ticketId} has been closed by ${interaction.user}`)
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });

                    // Delete channel after 5 seconds
                    setTimeout(() => {
                        interaction.channel.delete().catch(() => {});
                    }, 5000);
                }
            }

            // Music Control Buttons
            if (customId.startsWith('music_')) {
                const player = client.music.getPlayer(interaction.guild.id);

                if (!player) {
                    return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
                }

                const voiceChannel = interaction.member.voice.channel;
                if (!voiceChannel || voiceChannel.id !== player.voiceChannel) {
                    return interaction.reply({ 
                        content: '❌ You need to be in the same voice channel!', 
                        ephemeral: true 
                    });
                }

                switch (customId) {
                    case 'music_pause':
                        await client.music.pause(interaction.guild.id);
                        await interaction.reply({ content: '⏸️ Paused!', ephemeral: true });
                        break;
                    case 'music_resume':
                        await client.music.resume(interaction.guild.id);
                        await interaction.reply({ content: '▶️ Resumed!', ephemeral: true });
                        break;
                    case 'music_skip':
                        await client.music.skip(interaction.guild.id);
                        await interaction.reply({ content: '⏭️ Skipped!', ephemeral: true });
                        break;
                    case 'music_stop':
                        await client.music.stop(interaction.guild.id);
                        await interaction.reply({ content: '⏹️ Stopped!', ephemeral: true });
                        break;
                    case 'music_shuffle':
                        if (player.queue.length < 2) {
                            return interaction.reply({ content: '❌ Not enough songs to shuffle!', ephemeral: true });
                        }
                        player.queue.shuffle();
                        await interaction.reply({ content: '🔀 Queue shuffled!', ephemeral: true });
                        break;
                    case 'music_loop_track':
                        player.setLoop('TRACK');
                        await interaction.reply({ content: '🔂 Looping current track!', ephemeral: true });
                        break;
                    case 'music_loop_queue':
                        player.setLoop('QUEUE');
                        await interaction.reply({ content: '🔁 Looping queue!', ephemeral: true });
                        break;
                    case 'music_queue':
                        const queueList = player.queue.slice(0, 10).map((song, i) => 
                            `${i + 1}. ${song.info.title}`
                        ).join('\n') || 'Queue is empty';
                        await interaction.reply({ 
                            content: `📋 **Queue:**\n${queueList}`, 
                            ephemeral: true 
                        });
                        break;
                    case 'music_lyrics':
                        await interaction.reply({ 
                            content: '📝 Lyrics feature coming soon!', 
                            ephemeral: true 
                        });
                        break;
                    case 'music_autoplay':
                        player.autoplay = !player.autoplay;
                        await interaction.reply({ 
                            content: player.autoplay 
                                ? '🎲 Autoplay enabled! Related songs will play automatically.' 
                                : '🎲 Autoplay disabled!', 
                            ephemeral: true 
                        });
                        break;
                }
            }

            // Pagination Buttons
            if (customId.startsWith('page_')) {
                // Handle pagination (leaderboard, queue, etc.)
                await interaction.deferUpdate();
                // Implementation depends on your pagination system
            }

        } catch (error) {
            client.logger.error('Button Interaction Error:', error);
            const errorMsg = { content: '❌ An error occurred!', ephemeral: true };
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errorMsg).catch(() => {});
            } else {
                await interaction.reply(errorMsg).catch(() => {});
            }
        }
    }

    async handleSelectMenu(interaction) {
        const client = interaction.client;
        const customId = interaction.customId;
        const values = interaction.values;

        try {
            // Help Command Category Select
            if (customId === 'help_category') {
                const category = values[0];
                const commands = client.commands.filter(cmd => cmd.category === category);
                
                const { createContainer } = await import('../../utils/components.js');
                const { MessageFlags, StringSelectMenuBuilder, ActionRowBuilder } = await import('discord.js');

                const commandList = commands.map(cmd => `\`/${cmd.name}\` - ${cmd.description.content}`).join('\n') || 'No commands';

                const container = createContainer([
                    {
                        title: `📚 ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`,
                        separator: true
                    },
                    {
                        description: commandList
                    }
                ]);

                // Add back button to return to main menu
                const categories = [...new Set(client.commands.map(cmd => cmd.category))];
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('help_category')
                    .setPlaceholder('Select another category')
                    .addOptions(
                        categories.map(cat => ({
                            label: cat.charAt(0).toUpperCase() + cat.slice(1),
                            description: `View ${cat} commands`,
                            value: cat
                        }))
                    );

                const selectRow = new ActionRowBuilder().addComponents(selectMenu);
                container.addActionRowComponents(selectRow);

                await interaction.update({ 
                    components: [container],
                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
                });
            }

            // Ticket Category Select
            if (customId === 'ticket_category') {
                const category = values[0];
                
                await interaction.deferReply({ ephemeral: true });

                const { ticket, channel } = await client.tickets.createTicket(
                    interaction.guild,
                    interaction.user,
                    category
                );

                await interaction.editReply({
                    content: `✅ Ticket created! ${channel}`,
                    ephemeral: true
                });
            }

        } catch (error) {
            client.logger.error('Select Menu Interaction Error:', error);
            const errorMsg = { content: '❌ An error occurred!', ephemeral: true };
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errorMsg).catch(() => {});
            } else {
                await interaction.reply(errorMsg).catch(() => {});
            }
        }
    }

    async handleModal(interaction) {
        const client = interaction.client;
        const customId = interaction.customId;

        try {
            // Custom Embed Modal
            if (customId === 'custom_embed') {
                const title = interaction.fields.getTextInputValue('embed_title');
                const description = interaction.fields.getTextInputValue('embed_description');
                const color = interaction.fields.getTextInputValue('embed_color') || client.color.default;

                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor(color)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            client.logger.error('Modal Interaction Error:', error);
            await interaction.reply({ 
                content: '❌ An error occurred!', 
                ephemeral: true 
            }).catch(() => {});
        }
    }

    async logCommandUsage(interaction, command) {
        const client = interaction.client;
        const { config } = await import('../../config.js');

        // Console log
        client.logger.info(
            `[COMMAND] ${interaction.user.tag} (${interaction.user.id}) used /${command.name} in ${interaction.guild?.name || 'DM'} (${interaction.guild?.id || 'DM'})`
        );

        // Send to log channel
        const logChannelId = config.logs?.commands || config.logs?.channel;
        if (!logChannelId) return;

        const logChannel = client.channels.cache.get(logChannelId);
        if (!logChannel) return;

        try {
            // Get command options
            const options = [];
            if (interaction.options.data.length > 0) {
                interaction.options.data.forEach(opt => {
                    let value = opt.value;
                    if (opt.user) value = `@${opt.user.tag}`;
                    if (opt.channel) value = `#${opt.channel.name}`;
                    if (opt.role) value = `@${opt.role.name}`;
                    options.push(`**${opt.name}:** ${value}`);
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({
                    name: `${interaction.user.tag} used /${command.name}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .addFields(
                    {
                        name: '👤 User',
                        value: `${interaction.user} (\`${interaction.user.id}\`)`,
                        inline: true
                    },
                    {
                        name: '📝 Command',
                        value: `\`/${command.name}\``,
                        inline: true
                    },
                    {
                        name: '📂 Category',
                        value: command.category || 'Unknown',
                        inline: true
                    }
                );

            if (interaction.guild) {
                embed.addFields(
                    {
                        name: '🏠 Server',
                        value: `${interaction.guild.name}\n\`${interaction.guild.id}\``,
                        inline: true
                    },
                    {
                        name: '💬 Channel',
                        value: `${interaction.channel}\n\`${interaction.channel.id}\``,
                        inline: true
                    },
                    {
                        name: '📊 Server Size',
                        value: `${interaction.guild.memberCount} members`,
                        inline: true
                    }
                );
            } else {
                embed.addFields({
                    name: '📍 Location',
                    value: 'Direct Message',
                    inline: false
                });
            }

            if (options.length > 0) {
                embed.addFields({
                    name: '⚙️ Options',
                    value: options.join('\n'),
                    inline: false
                });
            }

            embed.setFooter({ 
                text: `Command ID: ${interaction.id}`,
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            client.logger.error('Failed to log command usage:', error);
        }
    }
}
