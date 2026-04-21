# Real-Time Fund ID Monitor

A very small PWA you can install on your phone to monitor a clean list of Chinese fund IDs in real time.

## What it does

- Track multiple fund codes directly, such as `161725`, `481010`, and `160517`
- Auto-refresh direct fund estimated rise/fall rates
- Save everything in local storage
- Install to your phone home screen as a PWA

## Why this approach

Some Chinese funds expose an intraday estimated涨跌幅 feed. This app focuses only on that direct fund-code monitoring experience so the UI stays simple and fast.

## Getting started

```bash
npm install
npm run dev
```

Then open the local URL in your browser. On a phone, open the deployed URL in Safari/Chrome and choose **Add to Home Screen**.

## Deploy to Vercel

This app is ready to deploy as a static site.

### Easiest path: Vercel dashboard

1. Push this project to a GitHub repository.
2. Sign in to Vercel.
3. Click **Add New Project**.
4. Import the GitHub repository.
5. Keep the detected settings:
	- Framework: `Vite`
	- Build command: `npm run build`
	- Output directory: `dist`
6. Click **Deploy**.

After deployment, open the Vercel URL in **Safari on your iPhone**, tap **Share**, then tap **Add to Home Screen**.

### Optional: Vercel CLI

If you prefer deploying from the terminal:

```bash
npm run deploy:vercel
```

The first run will ask you to sign in and link the project.

## Install on iPhone

1. Open the deployed HTTPS URL in **Safari**.
2. Tap the **Share** button.
3. Tap **Add to Home Screen**.
4. Tap **Add**.

Notes:

- Use **Safari** for the best install behavior on iPhone.
- Data is stored locally on that device, so your phone and laptop do not automatically sync yet.
- If you clear Safari site data, your saved baskets may be removed.

## Direct fund watchlist

Use the **Track fund codes** section to add as many 6-digit fund codes as you want.

Examples:

```text
161725
481010
160517
```

The app refreshes their estimated intraday rise/fall automatically while it is open.

## Notes

- Fund code must be 6 digits
- Estimate availability depends on the upstream provider and trading hours
- This is for monitoring only, not official pricing or investment advice
