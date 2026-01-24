# MTG Deck Builder

A locally hosted Magic: The Gathering deck builder application with live card data from Scryfall API, comprehensive keyword analysis, and CSV import/export functionality.

## Features

- 🎴 **Live Card Data**: Fetches real-time card information from Scryfall API
- 📊 **Deck Building**: Build and manage your decks with main deck and sideboard support
- 📥 **CSV Import**: Import bulk card collections or prebuilt decks from CSV files
- 📤 **CSV Export**: Export decks to CSV format compatible with tools like MythicTools
- ✅ **Deck Validation**: Validate decks for different formats (Standard, Modern, Legacy, etc.)
- 🔍 **Keyword Analysis**: Analyze keywords in your deck using Comprehensive Rules
- 📜 **Card Rulings**: View official rulings for each card
- ⚡ **Combo Suggestions**: Get suggested card interactions and synergies
- 💾 **No Database**: All data stored locally in browser (localStorage)
- 🎨 **Modern UI**: Beautiful, responsive dark theme interface

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to Cloudflare Pages or any static hosting service.

## Deployment to Cloudflare Pages

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick deploy:**
1. Build: `npm run build`
2. Deploy via Cloudflare Dashboard or Wrangler CLI:
   ```bash
   wrangler pages deploy dist --project-name=mtg-deckbuilder
   ```

## Usage

### Building a Deck

1. Navigate to the "Build Deck" tab
2. Search for cards using the search bar
3. Click on a card to add it to your deck, or click "View Details" for full card information
4. Adjust quantities using the +/- buttons
5. Move cards between main deck and sideboard using the arrow buttons

### Viewing Card Details

1. Search for a card
2. Click "View Details" on any card result
3. View:
   - Full card image and information
   - Official rulings from Scryfall
   - Combo suggestions and synergies
   - Keyword definitions

### Importing Bulk Cards

1. Go to the "Import Bulk" tab
2. Upload a CSV file or paste CSV data
3. Format: `Name,Quantity,Set,Collector Number`
4. Example:
```csv
Name,Quantity,Set,Collector Number
Lightning Bolt,4,LEB,161
Island,20,LEB,234
```

### Importing a Deck

1. Go to the "Import Deck" tab
2. Upload a deck file or paste a deck list
3. Supported formats:
   - Text format: `2 Lightning Bolt`
   - CSV format: `Name,Quantity`

### Validating Your Deck

1. Go to the "Validate" tab
2. Select your format (Standard, Modern, etc.)
3. Review errors, warnings, and suggestions

### Exporting Your Deck

Click the "Export CSV" button in the header to download your deck as a CSV file compatible with MythicTools and other deck management tools.

## CSV Format

### Export Format (MythicTools Compatible)

```csv
Name,Quantity,Set,Collector Number,CMC,Type,Colors
"Lightning Bolt",4,LEB,161,1,"Instant",R
"Island",20,LEB,234,0,"Basic Land — Island",U
```

### Import Format

```csv
Name,Quantity,Set,Collector Number
Lightning Bolt,4,LEB,161
Island,20,LEB,234
```

## Features in Detail

### Scryfall API Integration

- Real-time card search
- Card images and pricing
- Format legality checking
- Set information
- Official card rulings

### Keyword Analysis

Based on Magic: The Gathering Comprehensive Rules, the app analyzes:
- Flying, Trample, Haste, Vigilance
- First Strike, Double Strike
- Deathtouch, Lifelink
- Hexproof, Shroud, Indestructible
- Flash, Menace, Ward
- And more...

### Combo Suggestions

The app analyzes your deck to suggest:
- Draw synergies
- Sacrifice combos
- Mana ramp interactions
- Creature type synergies
- Color synergies

### Deck Validation

Validates:
- Deck size (minimum 60 cards)
- Sideboard size (maximum 15 cards)
- 4-of limit (except basic lands)
- Format legality
- Mana curve analysis
- Color distribution

## License

MIT
