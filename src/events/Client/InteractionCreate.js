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
            // Ticket Panel Create Buttons (from dashboard)
            if (customId.startsWith('ticket_create_')) {
                const typeIndex = parseInt(customId.split('_')[2]);
                await this.handleTicketCreate(interaction, typeIndex);
                return;
            }

            // Ticket System Buttons
            if (customId === 'ticket_close') {
                const { prisma } = await import('../../utils/database.js');
                const ticketId = parseInt(interaction.channel.topic?.match(/Ticket #(\d+)/)?.[1]);
                
                if (!ticketId) {
                    return interaction.reply({ content: '❌ Invalid ticket channel!', ephemeral: true });
                }

                await interaction.deferReply();

                // Update ticket status in database
                await prisma.ticket.updateMany({
                    where: { guildId: interaction.guild.id, ticketId: ticketId },
                    data: { status: 'closed', closedAt: new Date() }
                });

                const embed = new EmbedBuilder()
                    .setColor('#ed4245')
                    .setTitle('🔒 Ticket Closed')
                    .setDescription(`This ticket has been closed by ${interaction.user}\n\nThis channel will be deleted in 5 seconds.`)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

                // Delete channel after 5 seconds
                setTimeout(() => {
                    interaction.channel.delete().catch(() => {});
                }, 5000);
            }

            // Ticket Claim Button
            if (customId === 'ticket_claim') {
                const { prisma } = await import('../../utils/database.js');
                
                // Check if user has support role
                const guildData = await prisma.guild.findUnique({
                    where: { guildId: interaction.guild.id }
                });

                let settings = guildData?.settings || {};
                if (typeof settings === 'string') settings = JSON.parse(settings);

                const supportRoles = settings.supportRoles || [];
                const hasRole = supportRoles.some(roleId => interaction.member.roles.cache.has(roleId));

                if (!hasRole && !interaction.member.permissions.has('ManageChannels')) {
                    return interaction.reply({ content: '❌ You do not have permission to claim tickets!', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor('#3ba55c')
                    .setDescription(`✋ This ticket has been claimed by ${interaction.user}`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
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

            // Ticket Category Select (from dashboard panel)
            if (customId === 'ticket_select') {
                const value = values[0]; // ticket_create_0, ticket_create_1, etc.
                const typeIndex = parseInt(value.split('_')[2]);
                await this.handleTicketCreate(interaction, typeIndex);
                return;
            }

            // Ticket Category Select (legacy)
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

    async handleTicketCreate(interaction, typeIndex) {
        const client = interaction.client;
        const { prisma } = await import('../../utils/database.js');
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelType, PermissionFlagsBits, EmbedBuilder } = await import('discord.js');

        try {
            // Get guild settings
            const guildData = await prisma.guild.findUnique({
                where: { guildId: interaction.guild.id }
            });

            let settings = guildData?.settings || {};
            if (typeof settings === 'string') settings = JSON.parse(settings);

            const ticketTypes = settings.ticketTypes || [{ label: 'Support', emoji: '🎫' }];
            const ticketType = ticketTypes[typeIndex] || ticketTypes[0];

            // Check if user already has an open ticket
            const existingTicket = await prisma.ticket.findFirst({
                where: {
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    status: 'open'
                }
            });

            if (existingTicket) {
                return interaction.reply({
                    content: `❌ You already have an open ticket! <#${existingTicket.channelId}>`,
                    ephemeral: true
                });
            }

            // Check if ticket type has modal questions
            if (ticketType.questions && ticketType.questions.length > 0) {
                const modal = new ModalBuilder()
                    .setCustomId(`ticket_modal_${typeIndex}`)
                    .setTitle(ticketType.label || 'Create Ticket');

                ticketType.questions.slice(0, 5).forEach((q, idx) => {
                    const input = new TextInputBuilder()
                        .setCustomId(`question_${idx}`)
                        .setLabel(q.label.substring(0, 45))
                        .setStyle(q.type === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                        .setRequired(q.required || false)
                        .setMaxLength(q.type === 'paragraph' ? 1000 : 100);

                    if (q.placeholder) {
                        input.setPlaceholder(q.placeholder.substring(0, 100));
                    }

                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                });

                return interaction.showModal(modal);
            }

            // No modal questions, create ticket directly
            await this.createTicketChannel(interaction, ticketType, typeIndex, null);

        } catch (error) {
            client.logger.error('Ticket Create Error:', error);
            const errorMsg = { content: '❌ Failed to create ticket. Please try again.', ephemeral: true };
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errorMsg).catch(() => {});
            } else {
                await interaction.reply(errorMsg).catch(() => {});
            }
        }
    }

    async createTicketChannel(interaction, ticketType, typeIndex, modalResponses) {
        const client = interaction.client;
        const { prisma } = await import('../../utils/database.js');
        const { 
            ChannelType, 
            PermissionFlagsBits, 
            ActionRowBuilder, 
            ButtonBuilder, 
            ButtonStyle,
            ContainerBuilder,
            TextDisplayBuilder,
            SeparatorBuilder,
            SeparatorSpacingSize,
            MessageFlags
        } = await import('discord.js');

        await interaction.deferReply({ ephemeral: true });

        try {
            // Get guild settings
            const guildData = await prisma.guild.findUnique({
                where: { guildId: interaction.guild.id }
            });

            let settings = guildData?.settings || {};
            if (typeof settings === 'string') settings = JSON.parse(settings);

            // Get ticket count for naming
            const ticketCount = await prisma.ticket.count({
                where: { guildId: interaction.guild.id }
            });

            const ticketNumber = ticketCount + 1;
            
            // Build channel name from custom format or default
            const channelFormat = ticketType.channelFormat || 'ticket-{number}-{username}';
            const channelName = channelFormat
                .replace('{number}', ticketNumber)
                .replace('{username}', interaction.user.username)
                .replace('{type}', ticketType.label || 'ticket')
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '')
                .substring(0, 100); // Discord channel name limit

            // Permission overwrites
            const permissionOverwrites = [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                },
                {
                    id: client.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
                }
            ];

            // Add support roles
            if (settings.supportRoles && settings.supportRoles.length > 0) {
                for (const roleId of settings.supportRoles) {
                    permissionOverwrites.push({
                        id: roleId,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    });
                }
            }

            // Create channel
            const channel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: settings.ticketCategory || null,
                topic: `Ticket #${ticketNumber} | Created by ${interaction.user.tag} | Type: ${ticketType.label}`,
                permissionOverwrites
            });

            // Create ticket in database
            await prisma.ticket.create({
                data: {
                    ticketId: ticketNumber,
                    guildId: interaction.guild.id,
                    channelId: channel.id,
                    userId: interaction.user.id,
                    category: ticketType.label,
                    status: 'open'
                }
            });

            // Build welcome message using Components v2 (ContainerBuilder)
            const container = new ContainerBuilder();

            // Title section
            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`## ${ticketType.emoji || '🎫'} ${ticketType.label || 'Support Ticket'}`)
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
                    .setDivider(true)
            );

            // Welcome message
            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`Hello ${interaction.user}! Thank you for creating a ticket.\n\nPlease describe your issue and our support team will assist you shortly.`)
            );

            // Ticket info
            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`**Ticket Number:** #${ticketNumber}`)
            );

            // Add modal responses if any
            if (modalResponses && modalResponses.length > 0) {
                const ticketTypes = settings.ticketTypes || [];
                const questions = ticketTypes[typeIndex]?.questions || [];

                container.addSeparatorComponents(
                    new SeparatorBuilder()
                        .setSpacing(SeparatorSpacingSize.Small)
                        .setDivider(true)
                );

                container.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent('**📋 Submitted Information**')
                );

                modalResponses.forEach((response, idx) => {
                    const question = questions[idx];
                    if (question && response) {
                        container.addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(`**${question.label}**\n${response}`)
                        );
                    }
                });
            }

            // Add mentions at the top of container
            const mentions = [interaction.user.toString()];
            if (settings.supportRoles && settings.supportRoles.length > 0) {
                mentions.push(...settings.supportRoles.map(r => `<@&${r}>`));
            }
            
            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(mentions.join(' '))
            );

            // Add action buttons to container
            const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒'),
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Claim')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✋')
            );

            container.addActionRowComponents(buttonRow);

            await channel.send({ 
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            await interaction.editReply({
                content: `✅ Ticket created! ${channel}`,
                ephemeral: true
            });

        } catch (error) {
            client.logger.error('Create Ticket Channel Error:', error);
            await interaction.editReply({
                content: '❌ Failed to create ticket channel. Please contact an administrator.',
                ephemeral: true
            }).catch(() => {});
        }
    }

    async handleModal(interaction) {
        const client = interaction.client;
        const customId = interaction.customId;

        try {
            // Ticket Modal Submission
            if (customId.startsWith('ticket_modal_')) {
                const typeIndex = parseInt(customId.split('_')[2]);
                const { prisma } = await import('../../utils/database.js');

                // Get guild settings to get ticket type info
                const guildData = await prisma.guild.findUnique({
                    where: { guildId: interaction.guild.id }
                });

                let settings = guildData?.settings || {};
                if (typeof settings === 'string') settings = JSON.parse(settings);

                const ticketTypes = settings.ticketTypes || [{ label: 'Support', emoji: '🎫' }];
                const ticketType = ticketTypes[typeIndex] || ticketTypes[0];

                // Collect modal responses
                const responses = [];
                const questions = ticketType.questions || [];
                questions.forEach((q, idx) => {
                    try {
                        const value = interaction.fields.getTextInputValue(`question_${idx}`);
                        responses.push(value);
                    } catch (e) {
                        responses.push(null);
                    }
                });

                await this.createTicketChannel(interaction, ticketType, typeIndex, responses);
                return;
            }

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
