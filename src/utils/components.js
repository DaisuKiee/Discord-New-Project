import { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    EmbedBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} from 'discord.js';

/**
 * Create a button row with multiple buttons
 * @param {Array} buttons - Array of button configs
 * @returns {ActionRowBuilder}
 */
export function createButtonRow(buttons) {
    const row = new ActionRowBuilder();
    
    buttons.forEach(btn => {
        const button = new ButtonBuilder()
            .setCustomId(btn.customId)
            .setLabel(btn.label)
            .setStyle(btn.style || ButtonStyle.Primary);
        
        if (btn.emoji) button.setEmoji(btn.emoji);
        if (btn.disabled) button.setDisabled(true);
        if (btn.url) {
            button.setURL(btn.url);
            button.setStyle(ButtonStyle.Link);
        }
        
        row.addComponents(button);
    });
    
    return row;
}

/**
 * Create music control buttons (multiple rows)
 * @param {boolean} isPaused - Whether music is paused
 * @param {boolean} autoplay - Whether autoplay is enabled
 * @returns {Array<ActionRowBuilder>} Array of button rows
 */
export function createMusicControls(isPaused = false, autoplay = false) {
    // Row 1: Main controls
    const row1 = createButtonRow([
        { 
            customId: isPaused ? 'music_resume' : 'music_pause', 
            label: isPaused ? 'Resume' : 'Pause', 
            emoji: isPaused ? '▶️' : '⏸️', 
            style: ButtonStyle.Secondary 
        },
        { customId: 'music_skip', label: 'Skip', emoji: '⏭️', style: ButtonStyle.Primary },
        { customId: 'music_stop', label: 'Stop', emoji: '⏹️', style: ButtonStyle.Danger },
        { customId: 'music_shuffle', label: 'Shuffle', emoji: '🔀', style: ButtonStyle.Secondary }
    ]);
    
    // Row 2: Loop and Queue
    const row2 = createButtonRow([
        { customId: 'music_loop_track', label: 'Loop Track', emoji: '🔂', style: ButtonStyle.Secondary },
        { customId: 'music_loop_queue', label: 'Loop Queue', emoji: '🔁', style: ButtonStyle.Secondary },
        { customId: 'music_queue', label: 'Queue', emoji: '📋', style: ButtonStyle.Primary },
        { 
            customId: 'music_autoplay', 
            label: autoplay ? 'Autoplay: ON' : 'Autoplay: OFF', 
            emoji: '🎲', 
            style: autoplay ? ButtonStyle.Success : ButtonStyle.Secondary 
        }
    ]);
    
    return [row1, row2];
}

/**
 * Create pagination buttons
 * @param {number} page - Current page
 * @param {number} totalPages - Total pages
 * @returns {ActionRowBuilder}
 */
export function createPaginationButtons(page, totalPages) {
    return createButtonRow([
        { 
            customId: `page_first`, 
            label: 'First', 
            emoji: '⏮️', 
            style: ButtonStyle.Secondary,
            disabled: page === 1 
        },
        { 
            customId: `page_prev`, 
            label: 'Previous', 
            emoji: '◀️', 
            style: ButtonStyle.Primary,
            disabled: page === 1 
        },
        { 
            customId: `page_next`, 
            label: 'Next', 
            emoji: '▶️', 
            style: ButtonStyle.Primary,
            disabled: page === totalPages 
        },
        { 
            customId: `page_last`, 
            label: 'Last', 
            emoji: '⏭️', 
            style: ButtonStyle.Secondary,
            disabled: page === totalPages 
        }
    ]);
}

/**
 * Create a select menu
 * @param {string} customId - Custom ID for the menu
 * @param {string} placeholder - Placeholder text
 * @param {Array} options - Array of option objects
 * @returns {ActionRowBuilder}
 */
export function createSelectMenu(customId, placeholder, options) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .addOptions(options.map(opt => ({
            label: opt.label,
            description: opt.description || undefined,
            value: opt.value,
            emoji: opt.emoji || undefined
        })));
    
    return new ActionRowBuilder().addComponents(menu);
}

/**
 * Create ticket panel button
 * @returns {ActionRowBuilder}
 */
export function createTicketButton() {
    return createButtonRow([
        { 
            customId: 'ticket_create', 
            label: 'Create Ticket', 
            emoji: '🎫', 
            style: ButtonStyle.Success 
        }
    ]);
}

/**
 * Create ticket close button
 * @returns {ActionRowBuilder}
 */
export function createTicketCloseButton() {
    return createButtonRow([
        { 
            customId: 'ticket_close', 
            label: 'Close Ticket', 
            emoji: '🔒', 
            style: ButtonStyle.Danger 
        }
    ]);
}

/**
 * Create confirmation buttons
 * @param {string} action - Action identifier
 * @returns {ActionRowBuilder}
 */
export function createConfirmButtons(action) {
    return createButtonRow([
        { 
            customId: `confirm_${action}`, 
            label: 'Confirm', 
            emoji: '✅', 
            style: ButtonStyle.Success 
        },
        { 
            customId: `cancel_${action}`, 
            label: 'Cancel', 
            emoji: '❌', 
            style: ButtonStyle.Danger 
        }
    ]);
}

/**
 * Create a container with sections (Real Components v2 API)
 * @param {Array} sections - Array of section configs
 * @returns {ContainerBuilder}
 */
export function createContainer(sections) {
    const container = new ContainerBuilder();
    
    sections.forEach(section => {
        // If section has thumbnail, create a section with content and thumbnail
        if (section.thumbnail) {
            const sectionBuilder = new SectionBuilder();
            
            // Add title or description as content
            if (section.title) {
                sectionBuilder.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`**${section.title}**`)
                );
            }
            if (section.description) {
                sectionBuilder.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(section.description)
                );
            }
            
            // Add thumbnail accessory
            sectionBuilder.setThumbnailAccessory(
                new ThumbnailBuilder()
                    .setURL(section.thumbnail)
            );
            
            container.addSectionComponents(sectionBuilder);
        } else {
            // No thumbnail, just add text displays directly
            if (section.title) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`**${section.title}**`)
                );
            }
            
            if (section.description) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(section.description)
                );
            }
        }
        
        if (section.separator) {
            container.addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(section.separatorSize || SeparatorSpacingSize.Small)
                    .setDivider(true)
            );
        }
    });
    
    return container;
}

/**
 * Create a media gallery
 * @param {Array} mediaItems - Array of media URLs
 * @returns {MediaGalleryBuilder}
 */
export function createMediaGallery(mediaItems) {
    const gallery = new MediaGalleryBuilder();
    
    mediaItems.forEach(item => {
        const mediaItem = new MediaGalleryItemBuilder()
            .setURL(item.url);
        
        if (item.description) {
            mediaItem.setDescription(item.description);
        }
        
        gallery.addItems(mediaItem);
    });
    
    return gallery;
}



/**
 * Create a rich now playing embed
 * @param {Object} track - Track information
 * @param {Object} player - Player information
 * @returns {Object} Embed and buttons
 */
export function createNowPlayingDisplay(track, player) {
    const embed = createContainer([
        {
            title: '🎵 Now Playing',
            description: `**${track.info.title}**\nby ${track.info.author}`,
            thumbnail: track.info.artworkUrl || track.info.thumbnail,
            separator: true
        },
        {
            description: `⏱️ Duration: ${formatTime(track.info.length)}\n👤 Requested by: <@${track.info.requester}>\n📊 Queue: ${player.queue.length} song(s)`
        }
    ]);
    
    const buttons = createMusicControls();
    
    return { embed, buttons };
}

/**
 * Create a help embed with commands
 * @param {string} category - Command category
 * @param {Array} commands - Array of commands
 * @returns {EmbedBuilder}
 */
export function createHelpDisplay(category, commands) {
    const sections = [
        {
            title: `📚 ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`,
            separator: true
        }
    ];
    
    commands.forEach(cmd => {
        sections.push({
            description: `**/${cmd.name}** - ${cmd.description.content}`
        });
    });
    
    return createContainer(sections);
}

/**
 * Format time helper
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time
 */
function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
