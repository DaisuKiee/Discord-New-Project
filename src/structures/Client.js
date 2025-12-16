import { Client, Routes, REST, PermissionsBitField, ApplicationCommandType, GatewayIntentBits, Partials, Collection, EmbedBuilder } from 'discord.js';
import { readdirSync } from 'fs';
import pkg from 'mongoose';
const { connect, set } = pkg;
import { config } from '../config.js';
import Logger from './Logger.js';
import { connectDatabase } from '../utils/database.js';
import { redis } from '../utils/redis.js';
import { AIService } from '../services/ai/AIService.js';
import { moderationService } from '../services/moderation/ModerationService.js';
import { ticketService } from '../services/tickets/TicketService.js';

export class BotClient extends Client {
    constructor() {
        super({
            allowedMentions: {
                parse: ['users', 'roles', 'everyone'],
                repliedUser: false,
            },
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildVoiceStates,
                // MessageContent intent REMOVED - bot works with slash commands only
            ],
            partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User, Partials.Reaction],
        });
        this.config = config;
        if (!this.token) this.token = this.config.token;
        this.color = this.config.color;
        this.commands = new Collection();
        this.cooldowns = new Collection();
        this.aliases = new Collection();
        this.events = new Collection();
        this.logger = new Logger({
            displayTimestamp: true,
            displayDate: true,
        });
        
        // Initialize services
        this.ai = new AIService();
        this.moderation = moderationService;
        this.tickets = ticketService;
        this.redis = redis;
        
        // Import sticky and welcome services dynamically
        import('../services/sticky/StickyService.js').then(({ stickyService }) => {
            this.sticky = stickyService;
            this.sticky.client = this;
        });
        import('../services/welcome/WelcomeService.js').then(({ welcomeService }) => {
            this.welcome = welcomeService;
            this.welcome.client = this;
        });
    }
    
    embed() {
        return new EmbedBuilder();
    }
    
    async loadEvents() {
        let i = 0;
        const eventFiles = readdirSync('./src/events');
        for (const file of eventFiles) {
            const events = readdirSync(`./src/events/${file}`).filter(c => c.split('.').pop() === 'js');
            for (const event of events) {
                const Event = (await import(`../events/${file}/${event}`)).default;
                const eventClass = new Event(this, Event);
                this.events.set(eventClass.name, eventClass);
                const eventName = eventClass.name;
                if (eventClass.once) {
                    this.once(eventName, (...args) => eventClass.run(...args));
                } else {
                    this.on(eventName, (...args) => eventClass.run(...args));
                }
                i++;
            }
        }
        this.logger.event(`Loaded ${i} events`);
    }
    
    async loadCommands() {
        let i = 0;
        const cmdData = [];
        const commandFiles = readdirSync('./src/commands');
        
        // Load all commands
        for (const file of commandFiles) {
            const commands = readdirSync(`./src/commands/${file}`).filter(file => file.endsWith('.js'));
            for (const command of commands) {
                const Command = (await import(`../commands/${file}/${command}`)).default;
                const cmd = new Command(this, Command);
                cmd.file = Command;
                cmd.fileName = Command.name;
                this.commands.set(cmd.name, cmd);
                if (cmd.aliases && Array.isArray(cmd.aliases)) {
                    cmd.aliases.forEach(alias => {
                        this.aliases.set(alias, cmd.name);
                    });
                }
                if (cmd.slashCommand) {
                    const data = {
                        name: cmd.name,
                        description: cmd.description.content,
                        type: ApplicationCommandType.ChatInput,
                        options: cmd.options ? cmd.options : null,
                        name_localizations: cmd.nameLocalizations ? cmd.nameLocalizations : null,
                        description_localizations: cmd.descriptionLocalizations ? cmd.descriptionLocalizations : null,
                    };
                    if (cmd.permissions.user.length > 0) data.default_member_permissions = cmd.permissions.user ? PermissionsBitField.resolve(cmd.permissions.user).toString() : 0;
                    cmdData.push(data);
                    i++;
                }
            }
        }
        
        const rest = new REST({ version: '10', timeout: 30000 }).setToken(this ? this.config.token : config.token);
        
        try {
            this.logger.info('Refreshing slash commands...');
            
            if (!this.config.production) {
                // Global commands (for all servers) - SLOW
                this.logger.info('Using global commands (this may take 30-60 seconds)...');
                
                await rest.put(
                    Routes.applicationCommands(this ? this.config.clientId : config.clientId),
                    { body: cmdData }
                );
                this.logger.cmd(`Successfully registered ${i} global slash commands`);
            } else {
                // Guild-specific commands (faster updates for testing) - FAST
                if (this.config.guildId) {
                    this.logger.info('Using guild commands (instant registration)...');
                    
                    await rest.put(
                        Routes.applicationGuildCommands(this.config.clientId, this.config.guildId),
                        { body: cmdData }
                    );
                    this.logger.cmd(`Successfully registered ${i} guild slash commands ⚡`);
                } else {
                    this.logger.warn('GUILD_ID not set, using global commands');
                    await rest.put(
                        Routes.applicationCommands(this ? this.config.clientId : config.clientId),
                        { body: cmdData }
                    );
                    this.logger.cmd(`Successfully registered ${i} global slash commands`);
                }
            }
        } catch (e) {
            this.logger.error('Failed to register slash commands:', e);
            this.logger.warn('Bot will continue without slash commands');
        }
    }
    
    async connectMongodb() {
        set('strictQuery', true);
        await connect(this.config.mongourl);
        this.logger.ready('Connected to MongoDB');
    }
    
    async start() {
        // Load events and commands first
        await this.loadEvents();
        await this.loadCommands();
        
        // Login to Discord
        await super.login(this.token);
        
        // Connect databases
        if (this.config.mongourl) {
            await this.connectMongodb();
        }
        await connectDatabase();
        
        // Music service will be initialized in ready event
        // (Poru requires client to be ready first)
    }
}
