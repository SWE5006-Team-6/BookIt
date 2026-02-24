# Enabling Google Authenticator (TOTP) in Supabase

This app uses **Supabase Auth** with **TOTP (Time-based One-Time Password)** for two-factor authentication. TOTP is supported by default on Supabase; you only need to ensure your project is configured correctly and add one environment variable.

## 1. Supabase Dashboard – Confirm MFA is available

TOTP MFA is **enabled by default** on all Supabase projects. You do **not** need to turn it on in the dashboard.

Optional check:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Open **Authentication** → **Providers**.
3. Email provider should be enabled (for email/password sign-in). MFA is handled by Supabase Auth automatically; there is no separate “MFA” toggle for TOTP.

## 2. Get your Publishable key (required for MFA)

The backend needs the **publishable** key (or legacy anon key) for MFA. If you use the wrong key (e.g. the secret/service_role key), you will see **"Invalid API key"** when enabling 2FA.

1. In the Supabase Dashboard, go to **Project Settings** (gear icon) → **API**.
2. Under **Project API keys** use:
   - **Publishable** key (preferred, format `sb_publishable_...`) → set as `SUPABASE_PUBLISHABLE_KEY`
   - Or the legacy **anon public** key → set as `SUPABASE_ANON_KEY`
   - **Secret / service_role** → use only for `SUPABASE_SERVICE_ROLE_KEY`, **not** for MFA
3. Copy the **publishable** key (or anon key if your project only shows the legacy one). Do **not** use the secret/service_role key for MFA.

## 3. Backend environment variable

Add the publishable (or anon) key to your backend `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Or with the legacy anon key:

```env
SUPABASE_ANON_KEY=your-anon-public-key
```

- One of `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY` is required for MFA. The app prefers the publishable key if both are set.

Restart the backend after changing `.env`.

## 4. How it works in the app

- **Login**: After email/password sign-in, the backend checks whether the user has TOTP enrolled. If they do, the API returns `mfaRequired: true` and the frontend shows a 6-digit code input. The user enters the code from their authenticator app; the backend verifies it and returns new session tokens.
- **Enabling 2FA**: The user goes to **Settings** → **Two-factor authentication** → **Enable 2FA with Google Authenticator**. They scan the QR code (or enter the secret) in an app like Google Authenticator or Microsoft Authenticator, then enter a 6-digit code to confirm. After that, future logins require the code.

## 5. User flow summary

| Step | Action |
|------|--------|
| 1 | User signs in with email and password. |
| 2 | If 2FA is enabled, they see “Two-factor authentication” and enter the 6-digit code from their app. |
| 3 | To enable 2FA, they go to **Settings**, click **Enable 2FA**, scan the QR code, and confirm with a code. |

No extra configuration is required in the Supabase Dashboard for TOTP; adding `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`) on the backend is the only setup step.
