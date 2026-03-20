# 🃏 Poker Pals — Five Card Draw for Kids

A kid-friendly (ages 5+) poker teaching app with a built-in AI coach that guides every decision. Built with React + Vite, deployed free on GitHub Pages.

![Poker Pals](https://img.shields.io/badge/Ages-5+-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## What's Inside

- **🎮 Play & Learn** — Full Five Card Draw against a robot opponent. Coach Bear analyzes your hand, highlights which cards to keep (✅) and which to swap (👋), and reacts in real-time to your choices.
- **📚 Hand Rankings** — Interactive reference of all 10 poker hands from Royal Flush to High Card with tap-to-reveal example cards.
- **🧠 Quiz Mode** — "Which hand wins?" challenges with streak tracking.

## Quick Start (Local)

```bash
npm install
npm run dev
```

Open `http://localhost:5173/poker-pals/` in your browser.

## Deploy to GitHub Pages (Free)

### Step 1 — Create the repo on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Name it **poker-pals**
3. Keep it **Public**
4. Do **NOT** check "Add a README" (this repo already has one)
5. Click **Create repository**

### Step 2 — Push this code

Open a terminal in this folder and run:

```bash
git init
git add .
git commit -m "Initial commit - Poker Pals"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/poker-pals.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your actual GitHub username.

### Step 3 — Enable GitHub Pages

1. Go to your repo on GitHub → **Settings** → **Pages** (left sidebar)
2. Under **Source**, select **GitHub Actions**
3. That's it — the included workflow file handles the rest

### Step 4 — Wait ~2 minutes

The GitHub Action will automatically build and deploy. You can watch progress in the **Actions** tab of your repo.

### Step 5 — Open on your kid's tablet

Your app is live at:

```
https://YOUR_USERNAME.github.io/poker-pals/
```

Bookmark it on the tablet's home screen for an app-like experience!

> **iPad/iPhone:** Open in Safari → tap Share → "Add to Home Screen"
> **Android:** Open in Chrome → tap ⋮ menu → "Add to Home screen"

## How Five Card Draw Works (for parents)

1. **Ante** — Both players put $5 in the pot
2. **Deal** — Each player gets 5 cards
3. **Discard** — Swap 0-3 cards for new ones from the deck
4. **Bet** — Optional bet before the showdown
5. **Showdown** — Best hand wins the pot

The Coach Bear hint engine teaches kids:
- Which cards form their best hand
- Which cards to discard and why
- What they're hoping to draw into (flush draws, straight draws, etc.)
- When folding is the smart play

## Customization

**Change the repo name?** Update the `base` path in `vite.config.js`:
```js
base: '/your-repo-name/',
```

**Turn off hints by default?** In `src/PokerPals.jsx`, find `useState(true)` for `showHints` and change to `useState(false)`.

---

Built with ❤️ for teaching kids cards the fun way.
