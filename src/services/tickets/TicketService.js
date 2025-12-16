import { prisma } from '../../utils/database.js';
import { 
    ChannelType, 
    PermissionFlagsBits, 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle 
} from 'discord.js';
import { config } from '../../config.js';

export class TicketService {
    async createTicket(guild, user, category = 'general') {
        const lastTicket = await prisma.ticket.findFirst({
            where: { guildId: guild.id },
            orderBy: { ticketId: 'desc' }
        });

        const ticketId = lastTicket ? lastTicket.ticketId + 1 : 1;

        // Create ticket channel
        const channel = await guild.channels.create({
            name: `ticket-${ticketId}`,
            type: ChannelType.GuildText,
            topic: `Ticket #${ticketId} | ${user.tag} | ${category}`,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                }
            ]
        });

        // Save to database
        const ticket = await prisma.ticket.create({
            data: {
                ticketId,
                guildId: guild.id,
                channelId: channel.id,
                userId: user.id,
                category,
                status: 'open',
                priority: 'normal'
            }
        });

        // Send welcome message
        const embed = new EmbedBuilder()
            .setColor(config.color.info)
            .setTitle(`Ticket #${ticketId}`)
            .setDescription(`Welcome ${user}! Please describe your issue and a staff member will be with you shortly.`)
            .addFields(
                { name: 'Category', value: category, inline: true },
                { name: 'Status', value: 'Open', inline: true }
            )
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

        await channel.send({ embeds: [embed], components: [row] });

        return { ticket, channel };
    }

    async closeTicket(ticketId, guildId, closedBy) {
        const ticket = await prisma.ticket.findUnique({
            where: {
                guildId_ticketId: {
                    guildId,
                    ticketId
                }
            }
        });

        if (!ticket) return null;

        // Generate transcript (simplified)
        const transcript = `Ticket #${ticketId} closed by ${closedBy}`;

        // Update database
        await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                status: 'closed',
                closedAt: new Date(),
                transcript
            }
        });

        return ticket;
    }

    async getTicket(guildId, ticketId) {
        return await prisma.ticket.findUnique({
            where: {
                guildId_ticketId: {
                    guildId,
                    ticketId
                }
            }
        });
    }

    async getUserTickets(guildId, userId) {
        return await prisma.ticket.findMany({
            where: { guildId, userId },
            orderBy: { createdAt: 'desc' }
        });
    }
}

export const ticketService = new TicketService();
