import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../utils/database.js';

export class AIService {
    constructor() {
        this.openai = config.ai.openai ? new OpenAI({ apiKey: config.ai.openai }) : null;
        this.anthropic = config.ai.anthropic ? new Anthropic({ apiKey: config.ai.anthropic }) : null;
        this.google = config.ai.google ? new GoogleGenerativeAI(config.ai.google) : null;
        this.defaultProvider = 'openai';
    }

    async chat(userId, message, options = {}) {
        const {
            guildId = null,
            channelId,
            model = config.ai.defaultModel,
            systemPrompt = 'You are a helpful Discord bot assistant.',
            maxTokens = config.ai.maxTokens
        } = options;

        try {
            // Get conversation history
            const conversation = await this.getConversation(userId, channelId, guildId);
            
            // Add new message
            conversation.messages.push({ role: 'user', content: message });

            let response;
            
            // Try providers in order with fallback
            if (this.openai && (model.includes('gpt') || this.defaultProvider === 'openai')) {
                response = await this.chatOpenAI(conversation.messages, systemPrompt, model, maxTokens);
            } else if (this.anthropic && (model.includes('claude') || this.defaultProvider === 'anthropic')) {
                response = await this.chatAnthropic(conversation.messages, systemPrompt, model, maxTokens);
            } else if (this.google && (model.includes('gemini') || this.defaultProvider === 'google')) {
                response = await this.chatGoogle(conversation.messages, systemPrompt, model);
            } else {
                throw new Error('No AI provider available');
            }

            // Save conversation
            conversation.messages.push({ role: 'assistant', content: response.content });
            await this.saveConversation(userId, channelId, guildId, conversation.messages, response.tokensUsed, model);

            return response;
        } catch (error) {
            logger.error('AI chat error:', error);
            throw error;
        }
    }

    async chatOpenAI(messages, systemPrompt, model, maxTokens) {
        const completion = await this.openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            max_tokens: maxTokens,
            temperature: config.ai.temperature
        });

        return {
            content: completion.choices[0].message.content,
            tokensUsed: completion.usage.total_tokens,
            provider: 'openai'
        };
    }

    async chatAnthropic(messages, systemPrompt, model, maxTokens) {
        const response = await this.anthropic.messages.create({
            model: model.includes('claude') ? model : 'claude-3-sonnet-20240229',
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: messages
        });

        return {
            content: response.content[0].text,
            tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
            provider: 'anthropic'
        };
    }

    async chatGoogle(messages, systemPrompt, model) {
        const genModel = this.google.getGenerativeModel({ 
            model: model.includes('gemini') ? model : 'gemini-pro' 
        });
        
        const chat = genModel.startChat({
            history: messages.slice(0, -1).map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            })),
            generationConfig: {
                maxOutputTokens: config.ai.maxTokens,
                temperature: config.ai.temperature
            }
        });

        const result = await chat.sendMessage(messages[messages.length - 1].content);
        const response = await result.response;

        return {
            content: response.text(),
            tokensUsed: 0, // Google doesn't provide token count easily
            provider: 'google'
        };
    }

    async getConversation(userId, channelId, guildId) {
        const conversation = await prisma.aIConversation.findFirst({
            where: { userId, channelId, guildId },
            orderBy: { updatedAt: 'desc' }
        });

        if (conversation && conversation.messages.length < 20) {
            return conversation;
        }

        return {
            messages: [],
            tokensUsed: 0
        };
    }

    async saveConversation(userId, channelId, guildId, messages, tokensUsed, model) {
        // Keep only last 10 messages to manage context
        const trimmedMessages = messages.slice(-10);

        await prisma.aIConversation.upsert({
            where: {
                userId_channelId: {
                    userId,
                    channelId
                }
            },
            update: {
                messages: trimmedMessages,
                tokensUsed: { increment: tokensUsed },
                model,
                updatedAt: new Date()
            },
            create: {
                userId,
                channelId,
                guildId,
                messages: trimmedMessages,
                tokensUsed,
                model
            }
        });
    }

    async clearConversation(userId, channelId) {
        await prisma.aIConversation.deleteMany({
            where: { userId, channelId }
        });
    }

    async generateImage(prompt, options = {}) {
        if (!this.openai) {
            throw new Error('OpenAI API key not configured');
        }

        const { size = '1024x1024', quality = 'standard', n = 1 } = options;

        const response = await this.openai.images.generate({
            model: 'dall-e-3',
            prompt,
            n,
            size,
            quality
        });

        return response.data[0].url;
    }
}

export const aiService = new AIService();
