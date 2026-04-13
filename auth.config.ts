import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const YOUTUBE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl",
].join(" ");

export default {
  providers: [
    Google({
      authorization: {
        params: {
          scope: YOUTUBE_SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: { signIn: "/sign-in" },
} satisfies NextAuthConfig;
