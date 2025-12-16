import { prisma } from '../utils/database.js';

// Categories that are always enabled
const ALWAYS_ENABLED = ['music', 'utility', 'dev'];

export async function checkModuleEnabled(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return true;

    const category = command.category;
    
    // Always allow music, utility, and dev commands
    if (ALWAYS_ENABLED.includes(category)) {
        return true;
    }

    // Check if module is enabled for this guild
    const guild = await prisma.guild.findUnique({
        where: { guildId: interaction.guild.id }
    });

    if (!guild) {
        // No settings yet - modules disabled by default
        return false;
    }

    const modules = typeof guild.modulesEnabled === 'string' 
        ? JSON.parse(guild.modulesEnabled) 
        : guild.modulesEnabled;

    return modules[category] === true;
}

export function getModuleStatus(guildId) {
    return prisma.guild.findUnique({
        where: { guildId },
        select: { modulesEnabled: true, premium: true }
    });
}

export async function toggleModule(guildId, module, enabled) {
    const guild = await prisma.guild.findUnique({
        where: { guildId }
    });

    let modules = guild?.modulesEnabled || {};
    if (typeof modules === 'string') {
        modules = JSON.parse(modules);
    }

    modules[module] = enabled;

    return prisma.guild.upsert({
        where: { guildId },
        update: { modulesEnabled: modules },
        create: { 
            guildId, 
            modulesEnabled: modules 
        }
    });
}
