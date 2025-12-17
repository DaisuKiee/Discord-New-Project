import Command from '../../structures/Command.js';

export default class HelpCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'help',
            description: {
                content: 'Show all available commands',
                usage: 'help [command]',
                examples: ['help', 'help play']
            },
            category: 'utility',
            aliases: ['commands', 'h'],
            cooldown: 3,
            args: false,
            permissions: {
                dev: false,
                client: ['SendMessages', 'EmbedLinks'],
                user: []
            },
            slashCommand: true,
            prefixCommand: true,
            options: [
                {
                    name: 'command',
                    description: 'Get info about a specific command',
                    type: 3,
                    required: false
                }
            ]
        });
    }

    async run(message, args) {
        const commandName = args[0];
        const client = message.client;
        const { createContainer } = await import('../../utils/components.js');
        const { MessageFlags, StringSelectMenuBuilder, ActionRowBuilder } = await import('discord.js');

        if (commandName) {
            const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
            
            if (!command) {
                return message.reply(`❌ Command \`${commandName}\` not found!`);
            }

            const sections = [
                {
                    title: `📖 Command: ${client.config.prefix}${command.name}`,
                    description: command.description.content,
                    separator: true
                },
                {
                    description: `📁 **Category:** ${command.category}\n⏱️ **Cooldown:** ${command.cooldown}s\n🔧 **Usage:** \`${client.config.prefix}${command.description.usage}\``
                }
            ];

            if (command.aliases?.length > 0) {
                sections.push({ separator: true }, {
                    title: '🔀 Aliases',
                    description: command.aliases.map(a => `\`${a}\``).join(', ')
                });
            }

            if (command.description.examples?.length > 0) {
                sections.push({ separator: true }, {
                    title: '💡 Examples',
                    description: command.description.examples.map(e => `\`${client.config.prefix}${e}\``).join('\n')
                });
            }

            const container = createContainer(sections);
            return message.reply({ 
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Show all commands
        const categories = [...new Set(client.commands.map(cmd => cmd.category))];
        const categoryList = categories.map(cat => 
            `${this.getCategoryEmoji(cat)} **${cat.charAt(0).toUpperCase() + cat.slice(1)}** - ${client.commands.filter(cmd => cmd.category === cat).size} commands`
        ).join('\n');

        const container = createContainer([
            {
                title: '📚 Bot Commands',
                description: `Use \`${client.config.prefix}help <command>\` for more info.`,
                separator: true
            },
            {
                title: '📋 Categories',
                description: categoryList,
                separator: true
            },
            {
                description: `**Total Commands:** ${client.commands.size}`
            }
        ]);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Select a category')
            .addOptions(categories.map(cat => ({
                label: cat.charAt(0).toUpperCase() + cat.slice(1),
                description: `View ${cat} commands`,
                value: cat,
                emoji: this.getCategoryEmoji(cat)
            })));

        container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));

        return message.reply({ 
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }

    async slashRun(interaction) {
        const commandName = interaction.options.getString('command');

        if (commandName) {
            return this.showCommandInfo(interaction, commandName);
        }

        return this.showAllCommands(interaction);
    }

    async showAllCommands(interaction) {
        const client = interaction.client;
        const { MessageFlags, ContainerBuilder, StringSelectMenuBuilder, ActionRowBuilder } = await import('discord.js');
        
        // Get unique categories
        const categories = [...new Set(client.commands.map(cmd => cmd.category))];
        
        // Build category list
        const categoryList = categories.map(cat => 
            `${this.getCategoryEmoji(cat)} **${cat.charAt(0).toUpperCase() + cat.slice(1)}** - ${client.commands.filter(cmd => cmd.category === cat).size} commands`
        ).join('\n');
        
        const { createContainer } = await import('../../utils/components.js');
        
        const container = createContainer([
            {
                title: '📚 Bot Commands',
                description: 'Select a category below to view commands.',
                separator: true
            },
            {
                description: '**Note:** This bot uses slash commands only. Type `/` to see all commands.\nThis is just a BETA TESTING you can use this bot using music feature!.',
                separator: true
            },
            {
                title: '📋 Categories',
                description: categoryList,
                separator: true
            },
            {
                description: `**Total Commands:** ${client.commands.size}`
            }
        ]);

        // Create select menu and add it to the container
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Select a category')
            .addOptions(
                categories.map(cat => ({
                    label: cat.charAt(0).toUpperCase() + cat.slice(1),
                    description: `View ${cat} commands`,
                    value: cat,
                    emoji: this.getCategoryEmoji(cat)
                }))
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        container.addActionRowComponents(selectRow);

        await interaction.reply({ 
            components: [container],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });
    }

    async showCommandInfo(interaction, commandName) {
        const client = interaction.client;
        const command = client.commands.get(commandName);

        if (!command) {
            return interaction.reply({
                content: `❌ Command \`${commandName}\` not found!`,
                ephemeral: true
            });
        }

        const { createContainer } = await import('../../utils/components.js');
        const { MessageFlags } = await import('discord.js');

        const sections = [
            {
                title: `📖 Command: /${command.name}`,
                description: command.description.content,
                separator: true
            },
            {
                description: `📁 **Category:** ${command.category}\n⏱️ **Cooldown:** ${command.cooldown}s\n🔧 **Usage:** \`/${command.description.usage}\``
            }
        ];

        if (command.aliases && command.aliases.length > 0) {
            sections.push({
                separator: true
            }, {
                title: '🔀 Aliases',
                description: command.aliases.map(a => `\`${a}\``).join(', ')
            });
        }

        if (command.description.examples && command.description.examples.length > 0) {
            sections.push({
                separator: true
            }, {
                title: '💡 Examples',
                description: command.description.examples.map(e => `\`/${e}\``).join('\n')
            });
        }

        const container = createContainer(sections);

        await interaction.reply({ 
            components: [container],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }

    getCategoryEmoji(category) {
        const emojis = {
            'ai': '🤖',
            'music': '🎵',
            'moderation': '🛡️',
            'economy': '💰',
            'utility': '🔧',
            'fun': '🎮',
            'info': 'ℹ️',
            'config': '⚙️',
            'dev': '👨‍💻'
        };
        return emojis[category] || '📁';
    }
}
