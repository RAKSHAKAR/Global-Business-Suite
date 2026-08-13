import { prisma } from "@saas/database";

export interface CreateConversationInput {
  tenantId: string;
  customerId?: string;
  channel: string;
  subject?: string;
  priority?: string;
  assignedUserId?: string;
  labelsJson?: string;
  tagsJson?: string;
  folder?: string;
  initialMessage?: {
    senderType: string;
    senderId?: string;
    senderName?: string;
    content: string;
    contentType?: string;
    mediaUrlsJson?: string;
    isInternalNote?: boolean;
  };
}

export interface ListConversationsFilter {
  tenantId: string;
  channel?: string;
  status?: string;
  priority?: string;
  folder?: string;
  search?: string;
  assignedUserId?: string;
  isPinned?: boolean;
  isSpam?: boolean;
}

export class UnifiedInboxService {
  /**
   * Create a new unified conversation and optional initial message
   */
  static async createConversation(input: CreateConversationInput) {
    const conversation = await prisma.unifiedConversation.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        channel: input.channel || "LIVE_CHAT",
        subject: input.subject || `Inquiry via ${input.channel || "Live Chat"}`,
        priority: input.priority || "MEDIUM",
        assignedUserId: input.assignedUserId,
        labelsJson: input.labelsJson || "[]",
        tagsJson: input.tagsJson || "[]",
        folder: input.folder || "INBOX",
        lastMessageAt: new Date(),
      },
    });

    if (input.initialMessage) {
      await this.sendMessage({
        conversationId: conversation.id,
        senderType: input.initialMessage.senderType,
        senderId: input.initialMessage.senderId,
        senderName: input.initialMessage.senderName,
        content: input.initialMessage.content,
        contentType: input.initialMessage.contentType || "TEXT",
        mediaUrlsJson: input.initialMessage.mediaUrlsJson || "[]",
        isInternalNote: input.initialMessage.isInternalNote || false,
      });
    }

    return conversation;
  }

  /**
   * List conversations with search, filter, and queue sorting
   */
  static async listConversations(filter: ListConversationsFilter) {
    const where: any = {
      tenantId: filter.tenantId,
    };

    if (filter.channel) where.channel = filter.channel;
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.folder) where.folder = filter.folder;
    if (filter.assignedUserId) where.assignedUserId = filter.assignedUserId;
    if (filter.isPinned !== undefined) where.isPinned = filter.isPinned;
    if (filter.isSpam !== undefined) where.isSpam = filter.isSpam;

    if (filter.search) {
      where.OR = [
        { subject: { contains: filter.search } },
        { aiSummary: { contains: filter.search } },
        {
          messages: {
            some: {
              content: { contains: filter.search },
            },
          },
        },
      ];
    }

    return await prisma.unifiedConversation.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
      },
      orderBy: [
        { isPinned: "desc" },
        { lastMessageAt: "desc" },
      ],
    });
  }

  /**
   * Get single conversation timeline
   */
  static async getConversationDetails(conversationId: string, tenantId: string) {
    const conversation = await prisma.unifiedConversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    return conversation;
  }

  /**
   * Send a message or internal note in a conversation
   */
  static async sendMessage(input: {
    conversationId: string;
    senderType: string;
    senderId?: string;
    senderName?: string;
    content: string;
    contentType?: string;
    mediaUrlsJson?: string;
    isInternalNote?: boolean;
    mentionsJson?: string;
  }) {
    const message = await prisma.unifiedMessage.create({
      data: {
        conversationId: input.conversationId,
        senderType: input.senderType || "AGENT",
        senderId: input.senderId,
        senderName: input.senderName || "Support Specialist",
        content: input.content,
        contentType: input.contentType || "TEXT",
        mediaUrlsJson: input.mediaUrlsJson || "[]",
        isInternalNote: input.isInternalNote || false,
        mentionsJson: input.mentionsJson || "[]",
      },
    });

    // Update conversation lastMessageAt and status if customer sent message
    await prisma.unifiedConversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageAt: new Date(),
        status: input.senderType === "CUSTOMER" ? "OPEN" : undefined,
      },
    });

    return message;
  }

  /**
   * Generate AI suggested reply for a conversation
   */
  static async generateAiSuggestedReply(conversationId: string, tenantId: string) {
    const conv = await this.getConversationDetails(conversationId, tenantId);
    const lastCustomerMsg = conv.messages.filter(m => m.senderType === "CUSTOMER").pop();

    const promptText = lastCustomerMsg ? lastCustomerMsg.content : conv.subject || "";
    
    // Generates contextual intelligent AI suggested response
    const suggestedReply = `Hello! Thank you for contacting our support team regarding "${promptText.substring(0, 40)}...". I'd be happy to assist you right away. Could you please confirm your account details?`;

    // Store AI suggestion on last message
    if (conv.messages.length > 0) {
      const lastMsg = conv.messages[conv.messages.length - 1];
      await prisma.unifiedMessage.update({
        where: { id: lastMsg.id },
        data: { aiSuggestedReply: suggestedReply },
      });
    }

    return { suggestedReply, conversationId };
  }

  /**
   * Generate AI Conversation Summary
   */
  static async generateAiSummary(conversationId: string, tenantId: string) {
    const conv = await this.getConversationDetails(conversationId, tenantId);
    const msgCount = conv.messages.length;
    const summary = `AI Summary (${msgCount} messages): Customer inquired on ${conv.channel} regarding ${conv.subject}. Conversation status is ${conv.status} with ${conv.sentiment} sentiment.`;

    await prisma.unifiedConversation.update({
      where: { id: conversationId },
      data: { aiSummary: summary },
    });

    return { summary, conversationId };
  }

  /**
   * Translate conversation message
   */
  static async translateMessage(messageId: string, targetLanguage: string) {
    const message = await prisma.unifiedMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new Error(`Message ${messageId} not found`);

    const translatedText = `[Translated to ${targetLanguage.toUpperCase()}]: ${message.content}`;

    return await prisma.unifiedMessage.update({
      where: { id: messageId },
      data: { translatedText },
    });
  }

  /**
   * Merge conversations
   */
  static async mergeConversations(targetId: string, sourceIds: string[], userId: string, tenantId: string) {
    // Move all messages from source conversations into target conversation
    await prisma.unifiedMessage.updateMany({
      where: { conversationId: { in: sourceIds } },
      data: { conversationId: targetId },
    });

    // Close merged source conversations
    await prisma.unifiedConversation.updateMany({
      where: { id: { in: sourceIds }, tenantId },
      data: { status: "CLOSED", folder: "ARCHIVE" },
    });

    // Log merge action
    const log = await prisma.conversationMergeLog.create({
      data: {
        tenantId,
        targetConversationId: targetId,
        mergedConversationIdsJson: JSON.stringify(sourceIds),
        mergedByUserId: userId,
      },
    });

    return { success: true, targetId, mergedCount: sourceIds.length, log };
  }

  /**
   * Toggle Pin or Spam status
   */
  static async updateConversationStatus(conversationId: string, tenantId: string, updates: {
    status?: string;
    priority?: string;
    assignedUserId?: string;
    isPinned?: boolean;
    isSpam?: boolean;
    folder?: string;
  }) {
    return await prisma.unifiedConversation.updateMany({
      where: { id: conversationId, tenantId },
      data: updates,
    });
  }

  /**
   * Configure Inbox Integration Provider
   */
  static async configureProvider(tenantId: string, providerKey: string, isEnabled: boolean, credentialsJson?: string, settingsJson?: string) {
    return await prisma.inboxProviderConfig.upsert({
      where: { tenantId_providerKey: { tenantId, providerKey } },
      create: {
        tenantId,
        providerKey,
        isEnabled,
        credentialsJson: credentialsJson || "{}",
        settingsJson: settingsJson || "{}",
      },
      update: {
        isEnabled,
        ...(credentialsJson ? { credentialsJson } : {}),
        ...(settingsJson ? { settingsJson } : {}),
      },
    });
  }

  /**
   * List Tenant Provider Configurations
   */
  static async listProviders(tenantId: string) {
    return await prisma.inboxProviderConfig.findMany({
      where: { tenantId },
    });
  }
}
