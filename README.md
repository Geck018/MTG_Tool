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
