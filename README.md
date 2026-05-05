# SeatScore

Find the dormant Microsoft 365 Copilot or ChatGPT Enterprise seats burning your budget.

Upload your admin centre licence usage CSV, get a one-page report of who is paying for what, who is not using it, and the GBP per month going to seats nobody touches.

## Why it exists

Microsoft hit 20M paid Copilot seats in Q1 2026. Accenture took 740,000 in one deal. Every enterprise that bought is now in the deployed-but-unused phase. Nobody knows their actual utilisation rate. SeatScore surfaces the number in 30 seconds.

## What it does

- Drag a CSV exported from MS 365 admin centre Reports > Usage > Microsoft 365 Copilot.
- Tolerant header detection. Works with the standard export and most ChatGPT Enterprise admin exports.
- Each seat lands in one of four buckets: Active, Low use, Wrong role, Dormant.
- Job-title scoring flags seats unlikely to benefit (warehouse, frontline, drivers).
- Surfaces wasted spend per month and per year at your real cost per seat.
- Top departments by waste, exportable seat-level CSV.

## Stack

Next.js 15 + React 19 + TypeScript + Tailwind CSS (dark mode, mobile-first) + Neon Postgres via @neondatabase/serverless + ensureDb pattern + Vercel Analytics + Speed Insights.

## Privacy

CSVs are parsed in the request. Only the seat-level scoring output is stored, keyed to a private slug. No tenant access, no Graph API, nothing leaves your browser unless you upload it.

## Roadmap

- v0.2: optional Microsoft Graph API connection for live tenant pull.
- Cost-per-seat presets per SKU (Copilot, ChatGPT Enterprise, Gemini for Workspace).
- Trend view across multiple uploads to track utilisation over time.

Built free as part of the L8 portfolio. AI transformation consulting at GBP 1500-3000/day.
