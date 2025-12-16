import Event from '../../structures/Event.js';
import { MusicService } from '../../services/music/MusicService.js';

export default class ClientReady extends Event {
    constructor(...args) {
        super(...args, {
            name: 'ready',
            once: true
        });
    }
    async run() {
        console.log('🔥 READY EVENT FIRED!'); // Debug
        this.client.logger.ready(`Logged in as ${this.client.user.tag}`);
        this.client.logger.ready(`Serving ${this.client.guilds.cache.size} guilds with ${this.client.users.cache.size} users`);
        
        // Initialize music service (Poru must be initialized in ready event)
        try {
            console.log('🎵 Initializing music service...'); // Debug
            this.client.music = new MusicService(this.client);
            this.client.logger.ready('Music service initialized with Lavalink');
            console.log('✅ Music service ready!'); // Debug
        } catch (error) {
            console.error('❌ Music service error:', error); // Debug
            this.client.logger.warn('Music service initialization failed:', error.message);
        }
        
        this.client.user.setPresence({
            activities: [
                {
                    name: `Beta Bot | ${this.client.guilds.cache.size} servers`,
                    type: 3, // Watching
                }
            ],
            status: 'online',
        });
    }
}