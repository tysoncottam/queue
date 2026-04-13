# Queue

A personal, self-hosted alternative to the YouTube home feed. You tell it which channels and topics you care about, it gathers matching videos, and when you've watched them there's nothing left until you deliberately ask for more. No recommendations, no related videos, no Shorts.

**Built for one person.** Each deployment is a single-user app. If you want to share it with a friend, they should deploy their own copy — the setup takes about 20 minutes and costs nothing if you use the free tiers.

## Features

- **Saved searches** — "Dodger games from the MLB channel this year" or "anything Marques Brownlee posts." Polls daily; new videos appear in your queue automatically.
- **Paste a link** — drop in any YouTube URL for a one-off watch.
- **Live preview when building a search** — see the exact videos that would match as you type, plus the ones being skipped so you can tune keywords.
- **Intentional queue** — newest/oldest/by-channel sort. Click **Channels** or **Categories** to drill in.
- **No Shorts, ever** — filtered via a HEAD check against `youtube.com/shorts/{id}`, which is how YouTube itself distinguishes them. Duration-based heuristics miss Shorts between 60–180s; this doesn't.
- **Watched / Saved-for-later / Not-interested** actions. Swipe on mobile, click buttons on desktop.
- **Resume where you left off** — progress tracked via the YouTube IFrame Player API.
- **Comments** — read + post as yourself using the `youtube.force-ssl` OAuth scope.
- **PWA** — installs to your home screen on iOS/Android.

## Stack

- Next.js 16 (App Router) + Tailwind v4
- NextAuth v5 with Google OAuth + Drizzle adapter (JWT sessions)
- Drizzle ORM + libSQL — local SQLite file in dev, [Turso](https://turso.tech) in prod
- `googleapis` for YouTube Data API v3
- Framer Motion for swipe gestures
- Vercel (free tier) + Vercel Cron for daily polling

## Setup

### 1. Clone and install

```bash
git clone https://github.com/tysoncottam/queue.git
cd queue
npm install
```

### 2. Google Cloud — create an OAuth client + API key

This part is manual because Google requires it. Budget ~10 minutes.

1. **New project** → <https://console.cloud.google.com/projectcreate>. Name it anything. Parent resource: "No organization."
2. **Enable YouTube Data API v3** → <https://console.cloud.google.com/apis/library/youtube.googleapis.com>.
3. **OAuth consent screen** → <https://console.cloud.google.com/auth/overview>:
   - App name, support email, contact email.
   - Audience: **External**.
   - **Test users** → add your own Gmail. (You can add up to 100 people this way.)
   - Leave publishing status as **Testing**. No verification needed for personal use.
4. **Credentials** → <https://console.cloud.google.com/apis/credentials>:
   - **Create credentials → OAuth client ID** → Web application.
     - Authorized redirect URI: `http://localhost:3002/api/auth/callback/google` (dev).
     - For production, add `https://YOUR-DOMAIN/api/auth/callback/google`.
     - Copy the Client ID and Client Secret.
   - **Create credentials → API key**. Under API restrictions, restrict it to **YouTube Data API v3**.

### 3. Fill in `.env.local`

```bash
cp .env.example .env.local
```

Fill in:

```
AUTH_SECRET=           # openssl rand -base64 32
AUTH_GOOGLE_ID=        # from step 2
AUTH_GOOGLE_SECRET=    # from step 2
YOUTUBE_API_KEY=       # from step 2
TURSO_DATABASE_URL=file:local.db
CRON_SECRET=anything-random
```

### 4. Create the database + run

```bash
npm run db:push        # creates local.db with the schema
npm run dev            # starts on http://localhost:3002
```

Sign in with Google. When Google warns "unverified app," click **Advanced → Go to Queue (unsafe)** — that's expected in Testing mode. Head to **Searches → New** and create your first saved search.

## Deploy to Vercel (free)

1. Push your fork to GitHub.
2. Create a Turso DB:
   ```bash
   brew install tursodatabase/tap/turso
   turso auth signup
   turso db create queue
   turso db show queue --url
   turso db tokens create queue
   ```
3. Import your repo into Vercel.
4. Set environment variables in Vercel:
   - `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `YOUTUBE_API_KEY`
   - `TURSO_DATABASE_URL` (libsql://… URL from Turso)
   - `TURSO_AUTH_TOKEN`
   - `CRON_SECRET` (any random string)
   - `AUTH_URL` = your Vercel URL (e.g. `https://queue.yourdomain.com`)
5. In Google Cloud → OAuth client → add your Vercel URL + `/api/auth/callback/google` as an authorized redirect URI.
6. Run `npx drizzle-kit push` locally with `TURSO_DATABASE_URL` set to the remote URL to provision the schema.
7. Deploy. `vercel.json` already includes a daily cron that hits `/api/cron/poll`.

## Cost

- **Vercel**: free tier covers this easily.
- **Turso**: free tier includes 9 GB storage + 1B row reads/month. You'll use <1 MB.
- **Google APIs**: 10,000 units/day quota. One user's polls + browsing cost maybe 100 units/day.

Total: **$0/month** for a personal deployment.

## Architecture notes

- **Schema** (`lib/db/schema.ts`): `user`/`account`/`session` are managed by the Auth.js adapter; `saved_search`, `video`, `video_state` are the app's own.
- **Polling** (`lib/poll.ts`): for each active saved search, pulls the channel's recent uploads (cheap: 2 API units per search, not 100 like `search.list`), filters title against keywords, runs the Shorts HEAD check, inserts new rows. Runs daily via Vercel Cron and on-demand via the "Get new" button.
- **Shorts filtering** (`lib/youtube.ts::checkIsShort`): fetches `https://youtube.com/shorts/{id}` with `redirect: "manual"`. 200 means Short, 3xx means regular video. Cached per-video.
- **OAuth tokens**: refresh tokens are stored in the `account` table via the Drizzle adapter. The YouTube client (`lib/youtube.ts::userClient`) auto-refreshes access tokens using the `tokens` event and persists the rotation.
- **Middleware** (`middleware.ts`): uses `auth.config.ts` (edge-safe, no DB adapter) so redirects to `/sign-in` work in the edge runtime.

## Routes

| Path | Purpose |
|---|---|
| `/` | Queue — `All / Channels / Categories` tabs |
| `/searches` | Saved searches (list, pause, delete) |
| `/searches/new` | Create a search with live preview |
| `/searches/[id]` | Edit a search |
| `/add` | Paste a link to add a video |
| `/library` | Saved for Later + Watched history |
| `/watch/[videoId]` | Player + comments |
| `/api/cron/poll` | `POST` for logged-in user, `GET` with `Bearer $CRON_SECRET` for daily cron |

## What's deliberately not here

- Download/offline playback — streams only.
- Recommendation algorithm — the whole point.
- Auto-advance to next video.
- Watch history analytics.
- Multi-user support — each person deploys their own.

## License

MIT.
