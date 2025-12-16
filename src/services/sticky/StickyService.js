import { prisma } from '../../utils/database.js';

export class StickyService {
    constructor(client) {
        this.client = client;
    }

    async createSticky(guildId, channelId, content, embed = null) {
        return await prisma.stickyMessage.upsert({
            where: { channelId },
            update: {
                content,
                embed,
                enabled: true
            },
            create: {
                guildId,
                channelId,
                content,
                embed,
                enabled: true
            }
        });
    }

    async deleteSticky(channelId) {
        return await prisma.stickyMessage.delete({
            where: { channelId }
        });
    }

    async getSticky(channelId) {
        return await prisma.stickyMessage.findUnique({
            where: { channelId }
        });
    }

    async handleMessage(message) {
        if (message.author.bot) return;

        const sticky = await this.getSticky(message.channel.id);
        if (!sticky || !sticky.enabled) return;

        // Delete old sticky message
        if (sticky.messageId) {
            try {
                const oldMessage = await message.channel.messages.fetch(sticky.messageId);
                await oldMessage.delete();
            } catch (error) {
                // Message already deleted
            }
        }

        // Send new sticky message
        const payload = {};
        if (sticky.content) payload.content = sticky.content;
        if (sticky.embed) payload.embeds = [sticky.embed];

        const newMessage = await message.channel.send(payload);

        // Update sticky with new message ID
        await prisma.stickyMessage.update({
            where: { channelId: message.channel.id },
            data: { messageId: newMessage.id }
        });
    }
}

export const stickyService = new StickyService();
