import Event from '../../structures/Event.js';

export default class MessageCreate extends Event {
    constructor(...args) {
        super(...args, {
            name: 'messageCreate',
            once: false,
        });
    }

    async run(message) {
        if (message.author.bot || !message.guild) return;

        const client = message.client;
        
        // Handle sticky messages
        if (client.sticky) {
            await client.sticky.handleMessage(message).catch(() => {});
        }

        // Prefix command handling
        const prefix = client.config.prefix;
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Find command by name or alias
        const command = client.commands.get(commandName) || 
                        client.commands.get(client.aliases.get(commandName));

        if (!command || !command.prefixCommand) return;

        // Check user permissions
        if (command.permissions?.user?.length > 0) {
            if (!message.member.permissions.has(command.permissions.user)) {
                return message.reply({ 
                    content: '❌ You don\'t have permission to use this command.' 
                });
            }
        }

        // Check bot permissions
        if (command.permissions?.bot?.length > 0) {
            if (!message.guild.members.me.permissions.has(command.permissions.bot)) {
                return message.reply({ 
                    content: '❌ I don\'t have the required permissions to run this command.' 
                });
            }
        }

        // Cooldown handling
        if (!client.cooldowns.has(command.name)) {
            client.cooldowns.set(command.name, new Map());
        }
        const now = Date.now();
        const timestamps = client.cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
                return message.reply({ 
                    content: `⏱️ Please wait ${timeLeft}s before using \`${command.name}\` again.` 
                });
            }
        }
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

        // Execute command
        try {
            await command.run(message, args);
        } catch (error) {
            client.logger.error(`Error executing prefix command ${command.name}:`, error);
            message.reply({ content: '❌ An error occurred while executing this command.' });
        }
    }
}
