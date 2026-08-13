# How to Configure Google Business Profile API Credentials

To allow Dhandha AI to fetch reviews, reply to customers, and schedule posts on behalf of your users, you must set up an OAuth 2.0 Client in the Google Cloud Console and enable the correct APIs.

Please follow these steps carefully and input the resulting `Client ID` and `Client Secret` into the **Admin Portal > Settings > Integrations** page (which I am currently building).

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with the Google Account that owns or manages your primary business.
3. In the top navigation bar, click the project dropdown and click **New Project**.
4. Name it something like `Dhandha AI Platform` and click **Create**.

## Step 2: Enable the Required APIs

1. Make sure your new project is selected in the top bar.
2. In the left sidebar, go to **APIs & Services** > **Library**.
3. Search for and enable the following two APIs:
   - **Google My Business API** (or Business Profile API)
   - **Google People API** (needed for basic profile/email reading during login)

> [!IMPORTANT]  
> If you cannot find the "Google My Business API" or it says it is restricted, you may need to apply for access through the [Google Business Profile API Application Form](https://docs.google.com/forms/d/e/1FAIpQLSfC-EQKq317k2e2L-E6-l4KjIip0-VlG7N8c0Qz5e3Y9o9A_g/viewform).

## Step 3: Configure the OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**.
2. Choose **External** (unless this is only for internal employees on a Google Workspace) and click **Create**.
3. **App Information**: Fill in the App name (e.g., Dhandha AI), support email, and developer contact information.
4. **App Domain**: You can leave this blank for now during local development, but you will need to add your Privacy Policy and Terms of Service URLs before going to production.
5. Click **Save and Continue**.
6. **Scopes**: Click **Add or Remove Scopes**. Add `.../auth/business.manage` and `.../auth/userinfo.email`. Click **Save and Continue**.
7. **Test Users**: Add your own Google email address here so you can test the integration while the app is in "Testing" mode.

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Select **Web application** as the Application type.
4. Name it `Dhandha AI Web App`.
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
   - `http://localhost:3002`
   - `http://localhost:4000`
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:4000/api/v1/google/callback`
7. Click **Create**.

## Step 5: Save Credentials to Admin Portal

A modal will appear displaying your **Client ID** and **Client Secret**.
Copy both of these values and paste them into the Dhandha AI Admin Portal under Settings > Integrations.

> [!WARNING]
> Keep your Client Secret completely private. Do not share it or hardcode it into public frontend repositories. The backend will use these values securely.
