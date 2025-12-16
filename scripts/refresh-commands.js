import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function refreshCommands() {
    try {
        console.log('🔄 Refreshing slash commands...');

        const commands = [];
        const commandFolders = readdirSync('./src/commands');

        // Load all commands
        for (const folder of commandFolders) {
            const commandFiles = readdirSync(`./src/commands/${folder}`).filter(file => file.endsWith('.js'));
            
            for (const file of commandFiles) {
                const command = await import(`../src/commands/${folder}/${file}`);
                const cmd = new command.default();
                
                if (cmd.slashCommand) {
                    commands.push({
                        name: cmd.name,
                        description: cmd.description.content,
                        options: cmd.options || []
                    });
                }
            }
        }

        console.log(`📝 Found ${commands.length} commands to register`);

        // Clear old commands first
        console.log('🗑️  Clearing old commands...');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });

        if (process.env.GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: [] }
            );
        }

        // Register new commands
        console.log('📤 Registering new commands...');
        
        if (process.env.PRODUCTION === 'true' && process.env.GUILD_ID) {
            // Guild commands (instant update)
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            console.log(`✅ Successfully registered ${commands.length} guild commands`);
        } else {
            // Global commands (takes up to 1 hour)
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log(`✅ Successfully registered ${commands.length} global commands`);
            console.log('⏰ Note: Global commands may take up to 1 hour to update');
        }

        console.log('✅ Commands refreshed successfully!');
    } catch (error) {
        console.error('❌ Error refreshing commands:', error);
    }
}

refreshCommands();
