import { prisma } from '../../utils/database.js';
import { EmbedBuilder } from 'discord.js';
import { config } from '../../config.js';

export class ModerationService {
    async createCase(guildId, userId, moderatorId, type, reason, duration = null) {
        const lastCase = await prisma.case.findFirst({
            where: { guildId },
            orderBy: { caseId: 'desc' }
        });

        const caseId = lastCase ? lastCase.caseId + 1 : 1;

        return await prisma.case.create({
            data: {
                caseId,
                guildId,
                userId,
                moderatorId,
                type,
                reason,
                duration,
                active: true
            }
        });
    }

    async getCase(guildId, caseId) {
        return await prisma.case.findUnique({
            where: {
                guildId_caseId: {
                    guildId,
                    caseId
                }
            }
        });
    }

    async getCases(guildId, userId) {
        return await prisma.case.findMany({
            where: { guildId, userId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async warn(guild, user, moderator, reason) {
        const modCase = await this.createCase(
            guild.id,
            user.id,
            moderator.id,
            'warn',
            reason
        );

        // Update member warnings
        await prisma.member.upsert({
            where: {
                userId_guildId: {
                    userId: user.id,
                    guildId: guild.id
                }
            },
            update: {
                warnings: { increment: 1 },
                infractions: {
                    push: {
                        caseId: modCase.caseId,
                        type: 'warn',
                        reason,
                        date: new Date()
                    }
                }
            },
            create: {
                userId: user.id,
                guildId: guild.id,
                warnings: 1,
                infractions: [{
                    caseId: modCase.caseId,
                    type: 'warn',
                    reason,
                    date: new Date()
                }]
            }
        });

        return modCase;
    }

    async kick(guild, user, moderator, reason) {
        const modCase = await this.createCase(
            guild.id,
            user.id,
            moderator.id,
            'kick',
            reason
        );

        const member = await guild.members.fetch(user.id);
        await member.kick(reason);

        return modCase;
    }

    async ban(guild, user, moderator, reason, duration = null) {
        const modCase = await this.createCase(
            guild.id,
            user.id,
            moderator.id,
            'ban',
            reason,
            duration
        );

        await guild.members.ban(user.id, { reason });

        // Schedule unban if temporary
        if (duration) {
            setTimeout(async () => {
                await guild.members.unban(user.id, 'Temporary ban expired');
                await prisma.case.update({
                    where: { id: modCase.id },
                    data: { active: false }
                });
            }, duration);
        }

        return modCase;
    }

    async mute(guild, user, moderator, reason, duration) {
        const modCase = await this.createCase(
            guild.id,
            user.id,
            moderator.id,
            'mute',
            reason,
            duration
        );

        const member = await guild.members.fetch(user.id);
        await member.timeout(duration, reason);

        return modCase;
    }

    createCaseEmbed(modCase, user, moderator) {
        return new EmbedBuilder()
            .setColor(config.color.warn)
            .setTitle(`Case #${modCase.caseId} | ${modCase.type.toUpperCase()}`)
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Moderator', value: `${moderator.tag}`, inline: true },
                { name: 'Reason', value: modCase.reason || 'No reason provided' }
            )
            .setTimestamp();
    }
}

export const moderationService = new ModerationService();
