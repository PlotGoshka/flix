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
