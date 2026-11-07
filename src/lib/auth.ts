import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

export function isGoogleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_CLIENT_ID.length > 0 &&
      process.env.GOOGLE_CLIENT_SECRET.length > 0
  );
}

function authSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  // `next build` imports this module too, and has no runtime env to check.
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (!secret && process.env.NODE_ENV === "production" && !isBuild) {
    throw new Error("NEXTAUTH_SECRET is required in production");
  }
  return secret;
}

const providers = isGoogleConfigured()
  ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            scope: [
              "openid",
              "email",
              "profile",
              "https://www.googleapis.com/auth/calendar.events",
              "https://www.googleapis.com/auth/calendar.readonly",
            ].join(" "),
            access_type: "offline",
            prompt: "consent",
            include_granted_scopes: "true",
          },
        },
      }),
    ]
  : [];

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) throw new Error("no_refresh_token");
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(String(data.error || res.status));
    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + data.expires_in * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken, // Google may not rotate
      error: undefined,
    };
  } catch (e) {
    console.warn("[satro] Google token refresh failed:", e instanceof Error ? e.message : "unknown");
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: authSecret(),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        const refreshTokenPresent = Boolean(account.refresh_token);
        console[refreshTokenPresent ? "info" : "warn"]("[satro] Google sign-in", {
          refreshTokenPresent,
        });
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 3600 * 1000,
          error: undefined,
        };
      }
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 60_000) {
        return token;
      }
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
};
