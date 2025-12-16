import Command from '../../structures/Command.js';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default class SetupCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'setup',
            description: {
                content: 'Setup bot features with interactive panels',
                usage: 'setup [feature]',
                examples: ['setup', 'setup tickets', 'setup music']
            },
            category: 'config',
            aliases: [],
            cooldown: 5,
            args: false,
            permissions: {
                dev: false,
                client: ['SendMessages', 'EmbedLinks', 'ManageChannels'],
                user: [PermissionFlagsBits.ManageGuild]
            },
            slashCommand: true,
            options: [
                {
                    name: 'feature',
                    description: 'Feature to setup',
                    type: 3,
                    required: false,
                    choices: [
                        { name: 'Tickets', value: 'tickets' },
                        { name: 'Music', value: 'music' },
                        { name: 'Welcome', value: 'welcome' }
                    ]
                }
            ]
        });
    }

    async slashRun(interaction) {
        const feature = interaction.options.getString('feature');

        if (!feature) {
            return this.showMainMenu(interaction);
        }

        switch (feature) {
            case 'tickets':
                return this.setupTickets(interaction);
            case 'music':
                return this.setupMusic(interaction);
            case 'welcome':
                return this.setupWelcome(interaction);
        }
    }

    async showMainMenu(interaction) {
        const embed = new EmbedBuilder()
            .setColor(interaction.client.color.info)
            .setTitle('⚙️ Bot Setup')
            .setDescription('Select a feature to setup using the command:\n`/setup feature:<name>`')
            .addFields(
                { name: '🎫 Tickets', value: 'Setup ticket system with categories', inline: true },
                { name: '🎵 Music', value: 'Setup music controls panel', inline: true },
                { name: '👋 Welcome', value: 'Setup welcome messages', inline: true }
            )
            .setFooter({ text: 'Use /setup feature:<name> to configure' });

        await interaction.reply({ embeds: [embed] });
    }

    async setupTickets(interaction) {
        await interaction.deferReply();

        const embed = new EmbedBuilder()
            .setColor(interaction.client.color.info)
            .setTitle('🎫 Create a Ticket')
            .setDescription('Select a category below to create a support ticket.\n\nOur staff will assist you as soon as possible!')
            .addFields(
                { name: '❓ General Support', value: 'General questions and help', inline: true },
                { name: '🔧 Technical Issue', value: 'Report bugs or issues', inline: true },
                { name: '🚨 Report User', value: 'Report rule violations', inline: true },
                { name: '🤝 Partnership', value: 'Partnership inquiries', inline: true }
            )
            .setFooter({ text: 'Select a category from the menu below' })
            .setTimestamp();

        const { createSelectMenu } = await import('../../utils/components.js');
        const menu = createSelectMenu('ticket_category', 'Select a category', [
            { label: 'General Support', value: 'general', emoji: '💬' },
            { label: 'Technical Issue', value: 'technical', emoji: '🔧' },
            { label: 'Report User', value: 'report', emoji: '🚨' },
            { label: 'Partnership', value: 'partnership', emoji: '🤝' }
        ]);

        await interaction.editReply({
            embeds: [embed],
            components: [menu]
        });

        await interaction.followUp({
            content: '✅ Ticket panel created! Users can now create tickets.',
            ephemeral: true
        });
    }

    async setupMusic(interaction) {
        await interaction.deferReply();

        const embed = new EmbedBuilder()
            .setColor(interaction.client.color.info)
            .setTitle('🎵 Music Player')
            .setDescription('Use `/play` to start playing music!\n\nSupported platforms:\n• YouTube\n• Spotify\n• SoundCloud')
            .addFields(
                { name: '🎮 Controls', value: 'Use the buttons below to control playback', inline: false },
                { name: '📝 Commands', value: '`/play` `/queue` `/skip` `/stop` `/volume`', inline: false }
            )
            .setFooter({ text: 'Join a voice channel and use /play to start' })
            .setTimestamp();

        const { createMusicControls } = await import('../../utils/components.js');
        const controls = createMusicControls();

        await interaction.editReply({
            embeds: [embed],
            components: [controls]
        });

        await interaction.followUp({
            content: '✅ Music panel created!',
            ephemeral: true
        });
    }

    async setupWelcome(interaction) {
        const embed = new EmbedBuilder()
            .setColor(interaction.client.color.success)
            .setTitle('👋 Welcome System')
            .setDescription('Welcome system configuration:\n\n• Auto-role assignment\n• Welcome messages\n• Custom embeds\n• DM greetings')
            .addFields(
                { name: 'Status', value: '✅ Enabled', inline: true },
                { name: 'Channel', value: 'Not set', inline: true }
            )
            .setFooter({ text: 'Configure via dashboard for more options' });

        await interaction.reply({ embeds: [embed] });
    }
}
