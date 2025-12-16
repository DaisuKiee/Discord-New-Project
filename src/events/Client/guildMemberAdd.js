import Event from '../../structures/Event.js';

export default class GuildMemberAdd extends Event {
    constructor(...args) {
        super(...args, {
            name: 'guildMemberAdd',
            once: false
        });
    }

    async run(member) {
        // Handle welcome message
        if (this.client.welcome) {
            await this.client.welcome.handleMemberJoin(member);
        }
    }
}
