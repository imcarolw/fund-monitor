# Real-Time Fund ID Monitor

A very small PWA you can install on your phone to monitor a clean list of Chinese fund IDs in real time.

## What it does

- Track fund codes directly, such as `161725`
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

## Deploy with GitHub Pages

This repo is configured to deploy with **GitHub Pages** using GitHub Actions, so you do not need a Vercel account.

### One-time GitHub setup

1. Open your repo on GitHub: `https://github.com/imcarolw/fund-monitor`
2. Go to **Settings** → **Pages**
3. Under **Build and deployment**, set **Source** to **GitHub Actions**
4. Save if needed

### Trigger deployment

1. Push your latest code to the `main` branch
2. Open the **Actions** tab in GitHub
3. Wait for the **Deploy to GitHub Pages** workflow to finish

Your site should be published at:

`https://imcarolw.github.io/fund-monitor/`

## Install on iPhone

1. Open `https://imcarolw.github.io/fund-monitor/` in **Safari**.
2. Tap the **Share** button.
3. Tap **Add to Home Screen**.
4. Tap **Add**.

Notes:

- Use **Safari** for the best install behavior on iPhone.
- Data is stored locally on that device, so your phone and laptop do not automatically sync yet.
- If you clear Safari site data, your saved baskets may be removed.
- If your repository name changes, update `base` in `vite.config.ts` to match the new repo path.
- If you installed an older broken home-screen shortcut before this fix, delete it and add it again after the new deployment finishes.

## Direct fund watchlist

Use the **Track fund codes** section to add as many 6-digit fund codes as you want.

Examples:

```text
161725
```

The app refreshes their estimated intraday rise/fall automatically while it is open.

## Notes

- Fund code must be 6 digits
- Estimate availability depends on the upstream provider and trading hours
- This is for monitoring only, not official pricing or investment advice
