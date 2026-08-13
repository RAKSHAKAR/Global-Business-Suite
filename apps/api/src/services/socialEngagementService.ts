import { prisma } from "@saas/database";

export interface CreateCommentPayload {
  tenantId: string;
  platform: string;
  channelId?: string;
  postId?: string;
  externalCommentId?: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  sentiment?: number;
}

export interface CreateMessagePayload {
  tenantId: string;
  platform: string;
  channelId?: string;
  conversationId: string;
  senderName: string;
  senderAvatar?: string;
  senderId: string;
  messageText: string;
  mediaUrl?: string;
}

export class SocialEngagementService {
  /**
   * Get or create a unified engagement conversation thread
   */
  static async getOrCreateInbox(payload: { tenantId: string; platform: string; conversationId: string; senderName?: string; senderAvatar?: string; senderId?: string }) {
    const existing = await prisma.socialEngagementInbox.findUnique({
      where: { conversationId: payload.conversationId },
      include: { messages: true },
    });
    if (existing) return existing;

    return prisma.socialEngagementInbox.create({
      data: {
        tenantId: payload.tenantId,
        platform: payload.platform,
        conversationId: payload.conversationId,
        senderName: payload.senderName || "Unknown User",
        senderAvatar: payload.senderAvatar,
        senderId: payload.senderId,
      },
      include: { messages: true },
    });
  }

  /**
   * Add inbound/outbound message to conversation thread
   */
  static async addMessage(payload: CreateMessagePayload) {
    const inbox = await this.getOrCreateInbox({
      tenantId: payload.tenantId,
      platform: payload.platform,
      conversationId: payload.conversationId,
      senderName: payload.senderName,
      senderAvatar: payload.senderAvatar,
      senderId: payload.senderId,
    });

    const aiSuggestedReply = await this.generateAiSuggestedReply(payload.messageText);

    const message = await prisma.socialMessage.create({
      data: {
        inboxId: inbox.id,
        senderId: payload.senderId,
        senderName: payload.senderName,
        messageText: payload.messageText,
        mediaUrl: payload.mediaUrl,
        isFromCustomer: true,
        aiSuggestedReply,
      },
    });

    await prisma.socialEngagementInbox.update({
      where: { id: inbox.id },
      data: {
        lastMessageText: payload.messageText,
        unreadCount: { increment: 1 },
        status: "OPEN",
        updatedAt: new Date(),
      },
    });

    return message;
  }

  /**
   * Add comment thread and compute sentiment score
   */
  static async addComment(payload: CreateCommentPayload) {
    const sentiment = payload.sentiment ?? this.calculateSentimentScore(payload.content);
    return prisma.socialComment.create({
      data: {
        tenantId: payload.tenantId,
        platform: payload.platform,
        channelId: payload.channelId,
        postId: payload.postId,
        externalCommentId: payload.externalCommentId,
        authorName: payload.authorName,
        authorAvatar: payload.authorAvatar,
        content: payload.content,
        sentiment,
        status: "UNREAD",
      },
    });
  }

  /**
   * Moderation rule evaluation: Auto-reply, Hide or Tag
   */
  static async moderateComment(commentId: string, action: "REPLY" | "HIDE" | "DELETE", replyText?: string) {
    const comment = await prisma.socialComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error("Comment not found");

    return prisma.socialComment.update({
      where: { id: commentId },
      data: {
        status: action === "REPLY" ? "REPLIED" : action === "HIDE" ? "HIDDEN" : "DELETED",
        replyText: replyText || undefined,
        repliedAt: action === "REPLY" ? new Date() : undefined,
      },
    });
  }

  /**
   * Simple sentiment analysis (-1 to +1)
   */
  private static calculateSentimentScore(text: string): number {
    const positiveWords = ["great", "awesome", "love", "excellent", "best", "superb", "thank", "nice", "good"];
    const negativeWords = ["bad", "terrible", "worst", "hate", "awful", "horrible", "delay", "scam", "poor"];
    const lower = text.toLowerCase();

    let score = 0;
    positiveWords.forEach((w) => { if (lower.includes(w)) score += 0.25; });
    negativeWords.forEach((w) => { if (lower.includes(w)) score -= 0.25; });

    return Math.max(-1.0, Math.min(1.0, score));
  }

  /**
   * AI Reply Suggestion Engine
   */
  private static async generateAiSuggestedReply(text: string): Promise<string> {
    const lower = text.toLowerCase();
    if (lower.includes("price") || lower.includes("cost") || lower.includes("pricing")) {
      return "Thanks for reaching out! Our packages start with flexible plans tailored for your business. Check out our website or DM us your email for a custom quote!";
    }
    if (lower.includes("hours") || lower.includes("open") || lower.includes("location")) {
      return "We are open Monday to Saturday from 9 AM to 7 PM. You can find our full address and directions on our Google Business Profile!";
    }
    if (lower.includes("support") || lower.includes("help") || lower.includes("issue")) {
      return "We're sorry to hear you're experiencing an issue! Please share your account email and our support team will assist you right away.";
    }
    return "Thank you for your message! Our team will get back to you shortly. Feel free to explore our latest updates in the meantime.";
  }
}
