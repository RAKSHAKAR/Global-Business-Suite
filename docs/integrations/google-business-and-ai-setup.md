# Google Business Profile and AI setup

The solution uses two separate Google credentials:

1. A **Gemini API key** generates the text and image used by **Post Content**.
2. A **Google OAuth web client** lets each tenant connect and manage its own Google Business Profile.

Do not put either secret in browser code, commit it to Git, or send it in screenshots. Store it only in `apps/api/.env` (copied from `apps/api/.env.example`) or in the production secret manager.

## A. Enable real text and image generation

1. Open [Google AI Studio](https://ai.google.dev/aistudio) with the Google account that will own billing and quota.
2. Select **Get API key**, choose or create the intended Google Cloud project, and create a Gemini API key.
3. Keep the key restricted to the Gemini / Generative Language API. Google's current key guidance recommends AI Studio authorization keys and says unrestricted standard keys will stop being accepted in September 2026: [Using Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key).
4. Copy `apps/api/.env.example` to `apps/api/.env` if the file does not exist.
5. Set:

   ```dotenv
   GEMINI_API_KEY="your-key"
   AI_CONTENT_PROVIDER="gemini"
   GEMINI_IMAGE_MODEL="gemini-3.1-flash-image"
   PUBLIC_API_URL="http://localhost:4000"
   ```

6. Restart the API (`.\setup.ps1 -Action stop`, then `.\setup.ps1 -Action start -SkipInstall -NoBrowser`).
7. After signing in, verify `GET /api/v1/social/ai/provider-status` returns `configured: true` and `providers.gemini.configured: true`.

The application requests both text and image output from the current Gemini Interactions API. Generated assets are written beneath `apps/api/.generated-media` locally and the resulting post is created as `PENDING_APPROVAL`; generation never publishes it. See Google's current [Gemini image generation guide](https://ai.google.dev/gemini-api/docs/image-generation).

For production, `PUBLIC_API_URL` must be a public HTTPS API origin that social platforms can fetch. Replace local disk with durable object storage before running multiple API instances.

## B. Request Google Business Profile API access

Google Business Profile API access is not automatically enabled and has no sandbox.

1. Use a Google account that owns or manages a verified, active Google Business Profile.
2. Ensure that profile has been active for at least 60 days and links to the business's live website.
3. Create a Google Cloud project and record its **Project number** (not only its project ID).
4. Create a Google Business Profile **Organization account** if this product will manage profiles for clients.
5. While signed in with an email listed as an owner or manager of that Business Profile, submit Google's GBP API contact form and choose **Application for Basic API Access**.
6. Wait for approval. A Business Profile API quota of `0 QPM` means access has not been approved; the normal approved default is `300 QPM`.

These are Google's current eligibility and application steps: [Business Profile API prerequisites](https://developers.google.com/my-business/content/prereqs).

## C. Enable APIs and create the OAuth client

After Google approves that exact project:

1. In **APIs & Services > Library**, enable the Business Profile APIs listed in Google's [basic setup guide](https://developers.google.com/my-business/content/basic-setup):
   - Google My Business API
   - My Business Account Management API
   - My Business Lodging API
   - My Business Place Actions API
   - My Business Notifications API
   - My Business Verifications API
   - My Business Business Information API
   - My Business Q&A API
   - Business Profile Performance API as well if performance reporting will be used
2. Configure the OAuth consent screen. Add the application name, support email, privacy policy, terms, and authorized domain. While the app is in testing, add the Google accounts that will connect profiles as test users.
3. Add these scopes:
   - `https://www.googleapis.com/auth/business.manage`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
4. Go to **Credentials > Create credentials > OAuth client ID** and choose **Web application**.
5. Add this local authorized redirect URI exactly:

   ```text
   http://localhost:4000/api/v1/google/callback
   ```

6. For production, add the HTTPS equivalent on the production API domain. The string must exactly match `GOOGLE_REDIRECT_URI`.
7. Put the values in `apps/api/.env`:

   ```dotenv
   GOOGLE_CLIENT_ID="1234567890-example.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-oauth-client-secret"
   GOOGLE_REDIRECT_URI="http://localhost:4000/api/v1/google/callback"
   ENCRYPTION_KEY="a-strong-random-secret-with-at-least-32-characters"
   # Optional; otherwise JWT_SECRET signs the short-lived OAuth state:
   GOOGLE_OAUTH_STATE_SECRET="another-strong-random-secret"
   ```

8. Restart the API, sign in to the Partner Portal, select **Connect Google Business**, grant consent, and select the profiles/locations to manage.

The `business.manage` scope and offline refresh-token flow are documented in Google's [Business Profile OAuth guide](https://developers.google.com/my-business/content/implement-oauth). A user can revoke access later from their Google Account.

## Information needed from the account owner

The account owner needs to complete the external Google steps and then configure these values locally:

- `GEMINI_API_KEY`
- Google Cloud project number and confirmation that GBP API access is approved
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- a strong `ENCRYPTION_KEY` (at least 32 non-placeholder characters) for AES-256-GCM token storage
- optionally a separate `GOOGLE_OAUTH_STATE_SECRET` (otherwise the configured `JWT_SECRET` is used)
- the final production API URL and OAuth redirect URL when available
- the Google accounts to add as OAuth test users while the consent screen is in testing

Secrets should be entered directly into `apps/api/.env`; only confirm that they are present when asking another person to run validation.

## Other networks required for real publishing

Google credentials do not authorize Facebook, Instagram, LinkedIn, X, TikTok, Pinterest, Threads, YouTube, Reddit, Telegram, WhatsApp, or Snapchat. Each selected network needs its own approved developer application, OAuth callback, publishing scopes, and a connected tenant account. The publish endpoint returns a clear error when any selected platform lacks an active connection; it never reports an empty publish as success.
