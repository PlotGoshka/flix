# FLIX

**Smart subscription management and personal finance center.**

FLIX helps people keep recurring payments visible, understand their subscription costs, and stay ahead of upcoming charges.

## Current MVP

- Add and remove subscriptions manually
- Track service, category, amount, billing cycle, and next payment date
- Estimate monthly and yearly recurring costs, grouped by currency
- View upcoming charges in a payment radar
- Search your subscription list
- Save entries locally in the current browser

## Important

This is an early prototype. It does not connect to banks, access email or SMS, cancel subscriptions, or move money. Data is currently stored in the browser on the device where it was entered.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js
- React
- TypeScript
- Lucide icons

## Roadmap

1. Validate the subscription tracking experience.
2. Add secure user accounts and cloud sync.
3. Build import and recurring-payment detection from user-provided statements.
4. Add opt-in reminders and notification delivery.
5. Explore supported email and financial-data integrations.

---

FLIX is an independent tracking tool, not a bank or financial institution.
