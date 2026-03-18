# Tabletop Tools - MTG Deck Builder

**Live at: [tabletoptools.cc](https://tabletoptools.cc)**

A feature-rich Magic: The Gathering deck builder with live card data from Scryfall API, deck analysis, synergy detection, win condition analysis, and collection management.

## Features

### Core Features
- 🎴 **Live Card Data**: Real-time card information from Scryfall API
- 📊 **Deck Building**: Build decks with main deck, sideboard, and wishlist support
- 📥 **Import**: Import bulk collections or prebuilt decks (CSV/text)
- 📤 **Export**: Export decks to CSV format (MythicTools compatible)
- 💾 **Local Storage**: All data stored in browser - no account needed

### Deck Generation
- ⚡ **Auto Deck Generation**: Generate decks from your collection by mechanic
- 👑 **Commander Deck Builder**: Build 100-card Commander decks with synergy analysis
- 🎯 **Strategy Suggestions**: Get recommended cards for your strategy

### Analysis Tools
- 🔍 **Deck Analysis**: Full deck breakdown with:
  - ✅ Format legality checking (Standard, Modern, Pioneer, Legacy, Vintage, Commander)
  - 🔗 Synergy detection between cards
  - 📝 Strategy writeup and archetype detection
  - 🏆 **Win Condition Analysis** - How to play your deck to win
  - 📈 Mana curve visualization
  - 💡 Collection-based improvement suggestions
  - 🛒 Purchase recommendations with price estimates

### Collection Management
- 📚 **Bulk Import**: Import your collection from CSV
- 🔄 **Auto-Consume**: Optionally remove cards from collection when building decks
- ❤️ **Wishlist**: Track cards you want to acquire
- 🔍 **Missing Cards**: See what you need to complete a deck

### Card Information
- 📜 **Official Rulings**: View rulings from Scryfall
- 🔗 **Combo Suggestions**: Get synergy recommendations
- 📖 **Keyword Definitions**: Comprehensive Rules keyword explanations

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Building for Production

```bash
npm run build
```

Built files output to `dist/` directory.

## Deployment

Deployed on **Cloudflare Pages** at [tabletoptools.cc](https://tabletoptools.cc)

See [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md) for domain configuration.

### Frontend (Pages) + API (Worker) checklist

- **No Cloudflare dashboard auth** – The app uses its own username login/signup against the Worker; you don’t need to configure Cloudflare Access or any other Cloudflare auth.
- **API URL at build time** – The frontend bakes in the API base URL via `VITE_API_URL`. For Cloudflare Pages:
  1. **Dashboard** → your project → **Settings** → **Environment variables**.
  2. Add `VITE_API_URL` = `https://mtg-deckbuilder-api.marriesteyngcko.workers.dev` (or `https://api.tabletoptools.cc` if you use the custom domain).
  3. Apply to **Production** (and Preview if you want).
  4. **Redeploy** so the new build uses the variable (existing builds keep the old URL).
- **CORS** – The Worker allows `*` origin, so the Pages site can call the API from the browser without extra config.
- **Quick checks** – Open `https://mtg-deckbuilder-api.marriesteyngcko.workers.dev/api/health` (should return `{"status":"ok",...}`). On the live site, log in or sign up and try Import Deck; if those work, the frontend is talking to the API.

### One-command deploy (build + Worker + Pages)

From the repo root (with Wrangler logged in):

```bash
npm run deploy
```

This runs, in order: `npm run build` → `npm run deploy:api` (Worker) → `npm run deploy:pages` (uploads `dist/` to Cloudflare Pages).

- **Pages project name:** The script uses `--project-name=mtg-deckbuilder`. If your Pages project has a different name (e.g. the one linked to tabletoptools.cc), either change the `deploy:pages` script in `package.json` or run manually:
  `npx wrangler pages deploy dist --project-name=YOUR_PROJECT_NAME`
- **Env for build:** If you use direct upload (this script), `VITE_API_URL` is taken from `.env.production` when you run `npm run build` locally. Set it there or export it before `npm run deploy` so the built frontend points at your API.

### Verify you're on the latest frontend

- **Build cleans `dist/`** before each build (`prebuild` script), so each deploy uploads a fresh bundle.
- **HTML is no-cache** (`public/_headers`): `/` and `/index.html` use `Cache-Control: no-cache` so the browser requests the latest `index.html`, which references the new hashed JS (e.g. `/assets/index-XXXXX.js`).
- To confirm: open your site → DevTools → Network tab → hard refresh (Ctrl+Shift+R). Check the main JS request: the filename should match the hash from the last build (see `dist/index.html` after `npm run build`).

## Usage Guide

### Building a Deck
1. **Search Cards** tab: Find cards and add to deck
2. **Build Deck** tab: Manage quantities, move to sideboard
3. **Validate** tab: Check format legality
4. **Export**: Download as CSV

### Importing Your Collection
1. Go to **Import Bulk** tab
2. Upload CSV or paste data
3. Format: `Name,Quantity,Set,Collector Number`

### Analyzing a Deck
1. Go to **Deck Analysis** tab
2. Paste or upload a deck list
3. Select format and click **Analyze**
4. Review:
   - Legality status
   - Win conditions and gameplan
   - Synergies between cards
   - Strategy and archetype
   - Improvement suggestions

### Generating a Deck
1. **Generate Deck** tab: Build from collection by mechanic
2. **Commander Deck** tab: Build 100-card EDH decks
3. Select strategy/mechanic and format
4. Review generated deck and suggestions

## CSV Formats

### Export Format
```csv
Name,Quantity,Set,Collector Number,CMC,Type,Colors
"Lightning Bolt",4,LEB,161,1,"Instant",R
```

### Import Format
```csv
Name,Quantity,Set,Collector Number
Lightning Bolt,4,LEB,161
```

### Deck List Format (Text)
```
4 Lightning Bolt
4 Monastery Swiftspear
20 Mountain

Sideboard:
2 Searing Blood
```

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build**: Vite 5
- **Styling**: CSS with custom dark theme
- **API**: Scryfall (public, no auth required)
- **Storage**: Browser localStorage
- **Hosting**: Cloudflare Pages

## License

MIT
