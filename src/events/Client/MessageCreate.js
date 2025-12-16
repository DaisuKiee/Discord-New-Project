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

        // NOTE: Prefix commands are DISABLED without Message Content intent
        // All commands must use slash commands (/)
        // This is required for bots that can't get privileged intent approval
    }
}
