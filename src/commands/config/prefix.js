import Command from '../../structures/Command.js';
import { PermissionFlagsBits } from 'discord.js';
import { prisma } from '../../utils/database.js';

export default class PrefixCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'prefix',
            description: {
                content: 'Change bot prefix (Note: Bot uses slash commands)',
                usage: 'prefix <new_prefix>',
                examples: ['prefix !', 'prefix ?']
            },
            category: 'config',
            aliases: [],
            cooldown: 5,
            args: false,
            permissions: {
                dev: false,
                client: ['SendMessages'],
                user: [PermissionFlagsBits.ManageGuild]
            },
            slashCommand: true,
            options: [
                {
                    name: 'new_prefix',
                    description: 'New prefix',
                    type: 3,
                    required: true,
                    maxLength: 5
                }
            ]
        });
    }

    async slashRun(interaction) {
        const newPrefix = interaction.options.getString('new_prefix');

        await prisma.guild.upsert({
            where: { guildId: interaction.guild.id },
            update: { prefix: newPrefix },
            create: {
                guildId: interaction.guild.id,
                prefix: newPrefix
            }
        });

        return interaction.reply({
            content: `✅ Prefix changed to \`${newPrefix}\`\n\n**Note:** This bot primarily uses slash commands (\`/\`). Prefix commands are disabled without Message Content intent.`,
            ephemeral: true
        });
    }
}
