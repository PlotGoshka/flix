# FLIX

**Subscription & Money Center**

FLIX helps people keep recurring payments visible, understand their subscription costs, and prepare for upcoming charges.

## MVP features

- Add, edit, and delete subscriptions
- Track service, category, price, currency, billing cycle, and next payment date
- Estimate monthly recurring spend without mixing currencies
- Payment radar for upcoming charges
- Mark a charge as paid to advance its next payment date
- Search subscriptions and export the list to CSV
- Category breakdown based on entered subscription data
- Responsive dashboard for desktop and mobile

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Data and privacy

The MVP stores data in the browser's localStorage on the current device. It does not connect to banks, read email or SMS, cancel subscriptions, or move money. Automatic subscription discovery and cloud sync are not implemented.

## Stack

- Next.js
- React
- TypeScript
- lucide-react


## Backup and restore

In Settings, export a full JSON backup to move your list to another browser or device. Importing a backup replaces the current list after a confirmation. CSV export remains available for spreadsheets but is not a restorable backup. The Clear local data action removes tracked subscriptions and local reminder history from this browser.

## Automated checks

GitHub Actions runs lint and production build checks on pushes to `main` and pull requests targeting `main`. Checks are only confirmed after the workflow finishes successfully.

## Settings and reminders

- Configure local browser reminders for 0, 1, 3, or 7 days before a payment.
- Browser notifications are checked when FLIX is opened and are sent once per subscription payment date.
- Reminder preferences and the notification history are stored in the current browser.
- Telegram connection is shown as a planned integration; account linking and cloud sync are not available yet.


## Telegram bot (foundation)

FLIX includes a Telegram webhook endpoint at `/api/telegram/webhook`. It currently supports `/start`, `/help`, and `/status`. Subscription syncing and payment reminders are intentionally not enabled yet because the MVP still stores data only in the current browser.

Configure these server-side environment variables after deploying FLIX:

- `TELEGRAM_BOT_TOKEN` — token created with Telegram's official `@BotFather`. Keep it private; never add it to frontend code or commit it.
- `TELEGRAM_WEBHOOK_SECRET` — a long random secret used to verify Telegram webhook requests.

After deployment, register the webhook with Telegram's Bot API, using your public app URL and the same secret:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://<YOUR_PUBLIC_FLIX_DOMAIN>/api/telegram/webhook" \
  -d "secret_token=<YOUR_WEBHOOK_SECRET>"
```

Open the bot in Telegram and send `/start` to test it. Do not share the bot token in chat or commit it to GitHub. Before enabling real subscription reminders, FLIX needs secure sign-in, a shared database, and account-to-Telegram linking.
