import Command from '../../structures/Command.js';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default class CasesCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'cases',
            description: {
                content: 'View moderation cases for a user',
                usage: 'cases <user>',
                examples: ['cases @user']
            },
            category: 'moderation',
            aliases: ['history'],
            cooldown: 3,
            args: false,
            permissions: {
                dev: false,
                client: ['SendMessages', 'EmbedLinks'],
                user: [PermissionFlagsBits.ModerateMembers]
            },
            slashCommand: true,
            prefixCommand: true,
            options: [
                {
                    name: 'user',
                    description: 'User to check',
                    type: 6,
                    required: true
                }
            ]
        });
    }

    async run(message, args) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Please mention a user!');

        const cases = await message.client.moderation.getCases(message.guild.id, user.id);
        if (!cases || cases.length === 0) {
            return message.reply(`${user} has no moderation cases.`);
        }

        const { createContainer } = await import('../../utils/components.js');
        const { MessageFlags } = await import('discord.js');

        const casesList = cases.slice(0, 10).map(c => 
            `**Case #${c.caseId}** - ${c.type.toUpperCase()}\nReason: ${c.reason}`
        ).join('\n\n');

        const container = createContainer([
            {
                title: `📋 Cases for ${user.tag}`,
                thumbnail: user.displayAvatarURL(),
                separator: true
            },
            {
                description: casesList
            },
            {
                separator: true
            },
            {
                description: `📊 **Total cases:** ${cases.length}`
            }
        ]);

        return message.reply({ 
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }

    async slashRun(interaction) {
        const user = interaction.options.getUser('user');
        const cases = await interaction.client.moderation.getCases(interaction.guild.id, user.id);

        if (!cases || cases.length === 0) {
            return interaction.reply({
                content: `${user} has no moderation cases.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(interaction.client.color.warn)
            .setTitle(`📋 Cases for ${user.tag}`)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(
                cases.slice(0, 10).map(c => 
                    `**Case #${c.caseId}** - ${c.type.toUpperCase()}\n` +
                    `Reason: ${c.reason}\n` +
                    `Date: <t:${Math.floor(c.createdAt.getTime() / 1000)}:R>`
                ).join('\n\n')
            )
            .setFooter({ text: `Total cases: ${cases.length}` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
}
