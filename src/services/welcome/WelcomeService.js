import { prisma } from '../../utils/database.js';
import { EmbedBuilder } from 'discord.js';

export class WelcomeService {
    constructor(client) {
        this.client = client;
    }

    async handleMemberJoin(member) {
        const guild = await prisma.guild.findUnique({
            where: { guildId: member.guild.id }
        });

        if (!guild || !guild.welcomeChannel) return;

        const modules = typeof guild.modulesEnabled === 'string' 
            ? JSON.parse(guild.modulesEnabled) 
            : guild.modulesEnabled;

        if (!modules.welcome) return;

        const channel = member.guild.channels.cache.get(guild.welcomeChannel);
        if (!channel) return;

        try {
            if (guild.welcomeEmbed) {
                // Send custom embed
                const embedData = typeof guild.welcomeEmbed === 'string' 
                    ? JSON.parse(guild.welcomeEmbed) 
                    : guild.welcomeEmbed;

                const embed = new EmbedBuilder(embedData);
                
                // Replace placeholders
                if (embed.data.description) {
                    embed.setDescription(
                        this.replacePlaceholders(embed.data.description, member)
                    );
                }
                if (embed.data.title) {
                    embed.setTitle(
                        this.replacePlaceholders(embed.data.title, member)
                    );
                }

                await channel.send({ embeds: [embed] });
            } else if (guild.welcomeMessage) {
                // Send text message
                const message = this.replacePlaceholders(guild.welcomeMessage, member);
                await channel.send(message);
            } else {
                // Default welcome message
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('👋 Welcome!')
                    .setDescription(`Welcome to **${member.guild.name}**, ${member}!`)
                    .setThumbnail(member.user.displayAvatarURL())
                    .setFooter({ text: `Member #${member.guild.memberCount}` })
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            this.client.logger.error('Welcome Error:', error);
        }
    }

    replacePlaceholders(text, member) {
        return text
            .replace(/{user}/g, member.toString())
            .replace(/{username}/g, member.user.username)
            .replace(/{server}/g, member.guild.name)
            .replace(/{membercount}/g, member.guild.memberCount.toString())
            .replace(/{mention}/g, member.toString());
    }

    async setWelcomeChannel(guildId, channelId) {
        return await prisma.guild.upsert({
            where: { guildId },
            update: { welcomeChannel: channelId },
            create: { guildId, welcomeChannel: channelId }
        });
    }

    async setWelcomeMessage(guildId, message) {
        return await prisma.guild.upsert({
            where: { guildId },
            update: { welcomeMessage: message },
            create: { guildId, welcomeMessage: message }
        });
    }

    async setWelcomeEmbed(guildId, embed) {
        return await prisma.guild.upsert({
            where: { guildId },
            update: { welcomeEmbed: embed },
            create: { guildId, welcomeEmbed: embed }
        });
    }
}

export const welcomeService = new WelcomeService();
