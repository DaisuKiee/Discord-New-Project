import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function clearCommands() {
    try {
        console.log('🗑️  Clearing all slash commands...\n');

        // Clear global commands
        console.log('📡 Clearing global commands...');
        const globalCommands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
        console.log(`   Found ${globalCommands.length} global command(s)`);
        
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
        console.log('✅ Cleared all global commands\n');

        // Clear guild commands if GUILD_ID is set
        if (process.env.GUILD_ID) {
            console.log('🏠 Clearing guild commands...');
            const guildCommands = await rest.get(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
            );
            console.log(`   Found ${guildCommands.length} guild command(s)`);
            
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: [] }
            );
            console.log('✅ Cleared all guild commands\n');
        }

        console.log('✅ All commands cleared successfully!');
        console.log('💡 Restart your bot to register fresh commands');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing commands:', error);
        process.exit(1);
    }
}

clearCommands();
