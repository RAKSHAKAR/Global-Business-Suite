/**
 * GBS Social Publisher Service
 * Unified multi-platform social media publishing engine.
 * Supports: Facebook, Instagram, LinkedIn, Pinterest, TikTok, Threads, X/Twitter, YouTube, Google Business Profile
 */

export type Platform =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "LINKEDIN"
  | "PINTEREST"
  | "TIKTOK"
  | "THREADS"
  | "TWITTER_X"
  | "YOUTUBE"
  | "GOOGLE_BUSINESS"
  | "REDDIT"
  | "TELEGRAM"
  | "WHATSAPP"
  | "SNAPCHAT";

export interface SocialChannelCredentials {
  id: string;
  platform: Platform;
  accessToken: string;
  refreshToken?: string | null;
  accountId: string;
  accountName: string;
  tokenExpiresAt?: Date | string | null;
  healthStatus?: string;
  metadata?: string; // JSON string
}

export interface PostPayload {
  content: string;
  postType?: "POST" | "REEL" | "STORY" | "SHORT" | "CAROUSEL" | "POLL" | "EVENT" | "OFFER" | "ANNOUNCEMENT" | "DOCUMENT";
  imageUrls?: string[];
  videoUrl?: string;
  hashtags?: string[];
  linkUrl?: string;
  utmParams?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
}

export interface PublishResult {
  platform: Platform;
  channelId: string;
  status: "PUBLISHED" | "FAILED";
  externalPostId?: string;
  externalUrl?: string;
  error?: string;
  publishedAt?: Date;
}

// ─── Platform Publishers ───────────────────────────────────────────────────────

async function publishToFacebook(
  channel: SocialChannelCredentials,
  post: PostPayload,
): Promise<PublishResult> {
  try {
    const meta = channel.metadata ? JSON.parse(channel.metadata) : {};
    const pageId = meta.pageId || channel.accountId;
    const message = formatContent(post);

    let endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
    let body: Record<string, string> = {
      message,
      access_token: channel.accessToken,
    };

    // If image provided, use photos endpoint for first image
    if (post.imageUrls && post.imageUrls.length > 0) {
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      body = { ...body, url: post.imageUrls[0], caption: message };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `HTTP ${res.status}`);
    }

    const postId = data.id || data.post_id;
    return {
      platform: "FACEBOOK",
      channelId: channel.id,
      status: "PUBLISHED",
      externalPostId: postId,
      externalUrl: `https://www.facebook.com/${postId}`,
      publishedAt: new Date(),
    };
  } catch (err: any) {
    return { platform: "FACEBOOK", channelId: channel.id, status: "FAILED", error: err.message };
  }
}

async function publishToInstagram(
  channel: SocialChannelCredentials,
  post: PostPayload,
): Promise<PublishResult> {
  try {
    const meta = channel.metadata ? JSON.parse(channel.metadata) : {};
    const igUserId = meta.instagramBusinessAccountId || channel.accountId;
    const caption = formatContent(post);
    const token = channel.accessToken;

    if (!post.imageUrls || post.imageUrls.length === 0) {
      throw new Error("Instagram requires at least one image");
    }

    // Step 1: Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: post.imageUrls[0], caption, access_token: token }),
      },
    );
    const container = await containerRes.json();
    if (!containerRes.ok || container.error) {
      throw new Error(container.error?.message || "Failed to create media container");
    }

    // Step 2: Publish container
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: container.id, access_token: token }),
      },
    );
    const published = await publishRes.json();
    if (!publishRes.ok || published.error) {
      throw new Error(published.error?.message || "Failed to publish media");
    }

    return {
      platform: "INSTAGRAM",
      channelId: channel.id,
      status: "PUBLISHED",
      externalPostId: published.id,
      externalUrl: `https://www.instagram.com/p/${published.id}`,
      publishedAt: new Date(),
    };
  } catch (err: any) {
    return { platform: "INSTAGRAM", channelId: channel.id, status: "FAILED", error: err.message };
  }
}

async function publishToLinkedIn(
  channel: SocialChannelCredentials,
  post: PostPayload,
): Promise<PublishResult> {
  try {
    const text = formatContent(post);
    const personUrn = `urn:li:person:${channel.accountId}`;

    const body: Record<string, any> = {
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    if (post.linkUrl) {
      body.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory = "ARTICLE";
      body.specificContent["com.linkedin.ugc.ShareContent"].media = [
        { status: "READY", originalUrl: post.linkUrl },
      ];
    }

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channel.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

    const postId = data.id?.split(":").pop() || data.id;
    return {
      platform: "LINKEDIN",
      channelId: channel.id,
      status: "PUBLISHED",
      externalPostId: data.id,
      externalUrl: `https://www.linkedin.com/feed/update/${data.id}`,
      publishedAt: new Date(),
    };
  } catch (err: any) {
    return { platform: "LINKEDIN", channelId: channel.id, status: "FAILED", error: err.message };
  }
}

async function publishToTwitterX(
  channel: SocialChannelCredentials,
  post: PostPayload,
): Promise<PublishResult> {
  try {
    const text = formatContent(post, 280); // Twitter character limit

    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channel.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.title || `HTTP ${res.status}`);

    return {
      platform: "TWITTER_X",
      channelId: channel.id,
      status: "PUBLISHED",
      externalPostId: data.data?.id,
      externalUrl: `https://x.com/i/web/status/${data.data?.id}`,
      publishedAt: new Date(),
    };
  } catch (err: any) {
    return { platform: "TWITTER_X", channelId: channel.id, status: "FAILED", error: err.message };
  }
}

async function publishToPinterest(
  channel: SocialChannelCredentials,
  post: PostPayload,
): Promise<PublishResult> {
  try {
    if (!post.imageUrls || post.imageUrls.length === 0) {
      throw new Error("Pinterest requires at least one image");
    }
    const meta = channel.metadata ? JSON.parse(channel.metadata) : {};
    const boardId = meta.boardId || channel.accountId;

    const body: Record<string, any> = {
      board_id: boardId,
      title: post.content.substring(0, 100),
      description: post.content,
      media_source: { source_type: "image_url", url: post.imageUrls[0] },
    };
    if (post.linkUrl) body.link = post.linkUrl;

    const res = await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channel.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

    return {
      platform: "PINTEREST",
      channelId: channel.id,
      status: "PUBLISHED",
      externalPostId: data.id,
      externalUrl: `https://www.pinterest.com/pin/${data.id}`,
      publishedAt: new Date(),
    };
  } catch (err: any) {
    return { platform: "PINTEREST", channelId: channel.id, status: "FAILED", error: err.message };
  }
}

async function publishToTikTok(
  channel: SocialChannelCredentials,
  post: PostPayload,
): Promise<PublishResult> {
  try {
    // TikTok Content Posting API (Direct Post) — video required for full post
    // Text-only posts use "DIRECT_POST" with video — scaffold for video upload
    if (!post.videoUrl) {
      throw new Error(
        "TikTok requires a video URL. Text-only posts are not supported on TikTok.",
      );
    }

    const res = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: post.content.substring(0, 150),
            privacy_level: "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: post.videoUrl,
          },
        }),
      },
    );
    const data = await res.json();
    if (!res.ok || data.error?.code !== "ok") {
      throw new Error(data.error?.message || `HTTP ${res.status}`);
    }

    return {
      platform: "TIKTOK",
      channelId: channel.id,
      status: "PUBLISHED",
      externalPostId: data.data?.publish_id,
      publishedAt: new Date(),
    };
  } catch (err: any) {
    return { platform: "TIKTOK", channelId: channel.id, status: "FAILED", error: err.message };
  }
}

async function publishToThreads(
  channel: SocialChannelCredentials,
  post: PostPayload,
): Promise<PublishResult> {
  try {
    const text = formatContent(post);
    const userId = channel.accountId;
    const token = channel.accessToken;

    // Step 1: Create Threads container
    const body: Record<string, any> = {
      media_type: post.imageUrls && post.imageUrls.length > 0 ? "IMAGE" : "TEXT",
      text,
      access_token: token,
    };
    if (post.imageUrls && post.imageUrls.length > 0) {
      body.image_url = post.imageUrls[0];
    }

    const containerRes = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    const container = await containerRes.json();
    if (!containerRes.ok) throw new Error(container.error?.message || "Container creation failed");

    // Step 2: Publish container
    const publishRes = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: container.id, access_token: token }),
      },
    );
    const published = await publishRes.json();
    if (!publishRes.ok) throw new Error(published.error?.message || "Publish failed");

    return {
      platform: "THREADS",
      channelId: channel.id,
      status: "PUBLISHED",
      externalPostId: published.id,
      publishedAt: new Date(),
    };
  } catch (err: any) {
    return { platform: "THREADS", channelId: channel.id, status: "FAILED", error: err.message };
  }
}

async function publishToYouTube(
  channel: SocialChannelCredentials,
  post: PostPayload,
): Promise<PublishResult> {
  try {
    if (!post.videoUrl) {
      throw new Error("YouTube requires a video URL");
    }
    const source = new URL(post.videoUrl);
    if (!['http:', 'https:'].includes(source.protocol)) {
      throw new Error("YouTube video URL must use HTTP or HTTPS");
    }

    const videoResponse = await fetch(source);
    if (!videoResponse.ok) {
      throw new Error(`Could not download YouTube video (${videoResponse.status})`);
    }
    const contentType = videoResponse.headers.get("content-type") || "video/mp4";
    const declaredBytes = Number(videoResponse.headers.get("content-length") || 0);
    const maxUploadBytes = Number(process.env.YOUTUBE_MAX_UPLOAD_BYTES || 100 * 1024 * 1024);
    if (declaredBytes > maxUploadBytes) {
      throw new Error(`YouTube video exceeds the configured ${maxUploadBytes}-byte upload limit`);
    }
    const videoBytes = Buffer.from(await videoResponse.arrayBuffer());
    if (videoBytes.length === 0 || videoBytes.length > maxUploadBytes) {
      throw new Error("YouTube video is empty or exceeds the configured upload limit");
    }

    const initiate = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(videoBytes.length),
          "X-Upload-Content-Type": contentType,
        },
        body: JSON.stringify({
          snippet: {
            title: post.content.substring(0, 100) || "GBS video",
            description: formatContent(post, 5_000),
            tags: post.hashtags || [],
          },
          status: { privacyStatus: "private", selfDeclaredMadeForKids: false },
        }),
      },
    );
    if (!initiate.ok) {
      throw new Error(`YouTube upload initialization failed (${initiate.status}): ${(await initiate.text()).slice(0, 300)}`);
    }
    const uploadUrl = initiate.headers.get("location");
    if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL");

    const upload = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(videoBytes.length),
      },
      body: videoBytes,
    });
    const data = await upload.json().catch(() => ({})) as any;
    if (!upload.ok || !data.id) {
      throw new Error(data.error?.message || `YouTube upload failed (${upload.status})`);
    }
    return {
      platform: "YOUTUBE",
      channelId: channel.id,
      status: "PUBLISHED",
      externalPostId: data.id,
      externalUrl: `https://www.youtube.com/watch?v=${data.id}`,
      publishedAt: new Date(),
    };
  } catch (err: any) {
    return { platform: "YOUTUBE", channelId: channel.id, status: "FAILED", error: err.message };
  }
}

async function publishToGoogleBusiness(
  channel: SocialChannelCredentials,
  post: PostPayload,
  locationName?: string,
): Promise<PublishResult> {
  try {
    const locName = locationName || channel.accountId;
    const body: Record<string, any> = {
      languageCode: "en",
      summary: post.content,
      topicType: "STANDARD",
    };
    if (post.imageUrls && post.imageUrls.length > 0) {
      body.media = [{ mediaFormat: "PHOTO", sourceUrl: post.imageUrls[0] }];
    }

    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${locName}/localPosts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);

    return {
      platform: "GOOGLE_BUSINESS",
      channelId: channel.id,
      status: "PUBLISHED",
      externalPostId: data.name,
      publishedAt: new Date(),
    };
  } catch (err: any) {
    return { platform: "GOOGLE_BUSINESS", channelId: channel.id, status: "FAILED", error: err.message };
  }
}

async function publishToReddit(
  channel: SocialChannelCredentials,
  post: PostPayload,
): Promise<PublishResult> {
  try {
    const meta = channel.metadata ? JSON.parse(channel.metadata) : {};
    const subreddit = meta.subreddit || "test";
    const title = post.content.substring(0, 300);
    const text = formatContent(post);

    const body: Record<string, string> = {
      sr: subreddit,
      title,
      kind: post.linkUrl ? "link" : "self",
      text,
    };
    if (post.linkUrl) body.url = post.linkUrl;

    const res = await fetch("https://oauth.reddit.com/api/submit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channel.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "GBS-SocialEngine/1.0",
      },
      body: new URLSearchParams(body).toString(),
    });
    const data = await res.json();
    if (!res.ok || data.json?.errors?.length > 0) {
      throw new Error(data.json?.errors?.[0]?.[1] || `HTTP ${res.status}`);
    }

    const postId = data.json?.data?.id;
    return {
      platform: "REDDIT",
      channelId: channel.id,
      status: "PUBLISHED",
      externalPostId: postId,
      externalUrl: data.json?.data?.url || `https://www.reddit.com/comments/${postId}`,
      publishedAt: new Date(),
    };
  } catch (err: any) {
    return { platform: "REDDIT", channelId: channel.id, status: "FAILED", error: err.message };
  }
}

async function publishToTelegram(
  channel: SocialChannelCredentials,
  post: PostPayload,
): Promise<PublishResult> {
  try {
    const text = formatContent(post, 4096);
    const botToken = channel.accessToken;
    const chatId = channel.accountId; // Channel username e.g. @mychannel or chat_id integer

    let endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
    let body: Record<string, any> = { chat_id: chatId, text, parse_mode: "Markdown" };

    if (post.imageUrls && post.imageUrls.length > 0) {
      endpoint = `https://api.telegram.org/bot${botToken}/sendPhoto`;
      body = { chat_id: chatId, photo: post.imageUrls[0], caption: text, parse_mode: "Markdown" };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.description || `HTTP ${res.status}`);

    return {
      platform: "TELEGRAM",
      channelId: channel.id,
      status: "PUBLISHED",
      externalPostId: String(data.result?.message_id),
      publishedAt: new Date(),
    };
  } catch (err: any) {
    return { platform: "TELEGRAM", channelId: channel.id, status: "FAILED", error: err.message };
  }
}

async function publishToWhatsApp(
  channel: SocialChannelCredentials,
  post: PostPayload,
): Promise<PublishResult> {
  try {
    const meta = channel.metadata ? JSON.parse(channel.metadata) : {};
    const phoneNumberId = meta.phoneNumberId || channel.accountId;
    const text = formatContent(post, 4096);
    const recipientPhone = meta.recipientPhone || channel.accountId;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "text",
          text: { body: text },
        }),
      },
    );
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `HTTP ${res.status}`);

    return {
      platform: "WHATSAPP",
      channelId: channel.id,
      status: "PUBLISHED",
      externalPostId: data.messages?.[0]?.id,
      publishedAt: new Date(),
    };
  } catch (err: any) {
    return { platform: "WHATSAPP", channelId: channel.id, status: "FAILED", error: err.message };
  }
}

async function publishToSnapchat(
  channel: SocialChannelCredentials,
  _post: PostPayload,
): Promise<PublishResult> {
  return {
    platform: "SNAPCHAT",
    channelId: channel.id,
    status: "FAILED",
    error: "Snapchat organic publishing is not supported by the configured API adapter; no post was created.",
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatContent(post: PostPayload, maxLength?: number): string {
  let text = post.content;
  if (post.hashtags && post.hashtags.length > 0) {
    const tags = post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    text = `${text}\n\n${tags}`;
  }
  if (post.linkUrl) {
    let link = post.linkUrl;
    if (post.utmParams && (post.utmParams.source || post.utmParams.medium || post.utmParams.campaign)) {
      const urlObj = new URL(post.linkUrl.startsWith("http") ? post.linkUrl : `https://${post.linkUrl}`);
      if (post.utmParams.source) urlObj.searchParams.set("utm_source", post.utmParams.source);
      if (post.utmParams.medium) urlObj.searchParams.set("utm_medium", post.utmParams.medium);
      if (post.utmParams.campaign) urlObj.searchParams.set("utm_campaign", post.utmParams.campaign);
      if (post.utmParams.term) urlObj.searchParams.set("utm_term", post.utmParams.term);
      if (post.utmParams.content) urlObj.searchParams.set("utm_content", post.utmParams.content);
      link = urlObj.toString();
    }
    text = `${text}\n${link}`;
  }
  if (maxLength && text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + "...";
  }
  return text;
}

export function validateChannelHealth(channel: SocialChannelCredentials): { isHealthy: boolean; status: string; daysRemaining?: number } {
  if (!channel.accessToken) return { isHealthy: false, status: "REVOKED" };
  if (!channel.tokenExpiresAt) return { isHealthy: true, status: "HEALTHY" };

  const expires = new Date(channel.tokenExpiresAt).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return { isHealthy: false, status: "EXPIRED", daysRemaining: 0 };
  if (diffDays <= 7) return { isHealthy: true, status: "EXPIRING", daysRemaining: diffDays };
  return { isHealthy: true, status: "HEALTHY", daysRemaining: diffDays };
}

// ─── Main Publisher ───────────────────────────────────────────────────────────

export async function publishToChannel(
  channel: SocialChannelCredentials,
  post: PostPayload,
  options?: { locationName?: string },
): Promise<PublishResult> {
  switch (channel.platform) {
    case "FACEBOOK":       return publishToFacebook(channel, post);
    case "INSTAGRAM":      return publishToInstagram(channel, post);
    case "LINKEDIN":       return publishToLinkedIn(channel, post);
    case "TWITTER_X":      return publishToTwitterX(channel, post);
    case "PINTEREST":      return publishToPinterest(channel, post);
    case "TIKTOK":         return publishToTikTok(channel, post);
    case "THREADS":        return publishToThreads(channel, post);
    case "YOUTUBE":        return publishToYouTube(channel, post);
    case "GOOGLE_BUSINESS":return publishToGoogleBusiness(channel, post, options?.locationName);
    case "REDDIT":         return publishToReddit(channel, post);
    case "TELEGRAM":       return publishToTelegram(channel, post);
    case "WHATSAPP":       return publishToWhatsApp(channel, post);
    case "SNAPCHAT":       return publishToSnapchat(channel, post);
    default:
      return { platform: channel.platform as Platform, channelId: channel.id, status: "FAILED", error: `Unsupported platform: ${channel.platform}` };
  }
}

export async function publishToAllChannels(
  channels: SocialChannelCredentials[],
  post: PostPayload,
  options?: { locationName?: string },
): Promise<PublishResult[]> {
  return Promise.all(channels.map((ch) => publishToChannel(ch, post, options)));
}
