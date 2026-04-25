# SDA Forum

A communication platform for Seventh-day Adventist church leaders to share events and announcements with their members. Church leaders (admins and moderators) publish posts and events to forums; members receive email notifications and digests to stay up to date with what's happening in their church community.

## How it works

**Church leaders** (admins and forum moderators) are responsible for all content. They create forums for different parts of church life, post announcements and upcoming events, and send digest emails to keep members informed.

**Church members** sign up, follow the forums relevant to them, and receive notifications when new content is posted. They can read posts, view event details, and manage which notifications they receive — but posting is reserved for leaders.

## Features

- **Forums** — channels scoped to specific ministries, groups, or locations; leaders post, members follow
- **Posts & Announcements** — created by admins and moderators; can be pinned or locked
- **Events** — posts with date, time, and location; past events are automatically archived
- **Topics** — tag system for categorising posts so members can find relevant content
- **Groups** — visibility-controlled communities (public or invite-only)
- **Inbox** — in-app notification inbox so members never miss an update
- **Digest emails** — admins and moderators can send a curated summary of upcoming events, site-wide or per-forum
- **Notification preferences** — members control which forums and event types they hear about
- **Admin panel** — manage members, forums, topics, announcements, reports, and digest sends
- **Onboarding** — guided setup flow for new members joining the platform

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, server components, server actions) |
| Database & Auth | [Supabase](https://supabase.com) (PostgreSQL + Row Level Security + Magic Link auth) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Email | [Nodemailer](https://nodemailer.com) (SMTP) |
| Testing | [Vitest](https://vitest.dev) |
| Deployment | [Vercel](https://vercel.com) |

---

## Getting started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- An SMTP email provider (e.g. [Resend](https://resend.com), Gmail, Mailgun)

### 1. Clone the repo

```bash
git clone https://github.com/bensonkikitip/sda-forum.git
cd sda-forum
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in each variable — see the [Environment variables](#environment-variables) section below for what each one does.

### 4. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API** and copy your URL and keys into `.env.local`
3. Open the **SQL Editor** in your Supabase dashboard
4. Run each migration file in order from the `supabase/` folder:

```
supabase/01_tables.sql
supabase/02_functions.sql
supabase/03_rls_policies.sql
supabase/04_triggers.sql
supabase/05_seed_churches.sql
supabase/06_add_city_to_profiles.sql
supabase/07_grants.sql
supabase/08_fix_comment_count_trigger.sql
supabase/09_auto_profile_trigger.sql
supabase/10_notifications.sql
supabase/11_groups.sql
supabase/12_auto_subscribe.sql
supabase/13_forum_moderators.sql
supabase/14_mod_visibility.sql
supabase/15_events.sql
supabase/16_topics.sql
supabase/17_notification_prefs.sql
supabase/18_digest.sql
```

Paste and run each file in order — they build on each other, so order matters.

5. In Supabase go to **Authentication → URL Configuration** and set:
   - **Site URL**: `http://localhost:3000` (change to your production URL when deploying)
   - **Redirect URLs**: add `http://localhost:3000/**`

### 5. Set your admin account

Set `ADMIN_EMAIL` in `.env.local` to your email address. The first time you sign in with that email, the app will automatically grant you admin access.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with your email — Supabase will send a magic link.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL — found in Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous (public) key — same location |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key — used server-side only, never exposed to the browser |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Full URL of your site, e.g. `https://yourforum.com` (no trailing slash) |
| `ADMIN_EMAIL` | ✅ | Email address that gets auto-promoted to admin on first sign-in |
| `SMTP_HOST` | ✅ | SMTP server hostname, e.g. `smtp.resend.com` |
| `SMTP_PORT` | ✅ | SMTP port, typically `465` (SSL) or `587` (TLS) |
| `SMTP_USER` | ✅ | SMTP username |
| `SMTP_PASSWORD` | ✅ | SMTP password or API key |
| `SMTP_FROM` | ✅ | The "from" address for outgoing emails, e.g. `noreply@yourforum.com` |
| `NOTIFICATION_WEBHOOK_SECRET` | ✅ | A random secret string used to authenticate the notification webhook — generate one with `openssl rand -hex 32` |

---

## Running tests

```bash
npm test
```

Tests cover the core utility functions — timezone math, event grouping, notification link parsing, and digest stale-content detection. CI runs automatically on every pull request via GitHub Actions.

To run in watch mode during development:

```bash
npm run test:watch
```

---

## Deployment

The easiest way to deploy is [Vercel](https://vercel.com):

1. Push your repo to GitHub
2. Import it in Vercel
3. Add all the environment variables from `.env.local` into Vercel's **Environment Variables** settings
4. Update `NEXT_PUBLIC_SITE_URL` to your production domain
5. Update the Supabase **Site URL** and **Redirect URLs** to your production domain
6. Deploy

Vercel will automatically redeploy on every push to `main`.
