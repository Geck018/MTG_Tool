# Cloudflare D1 Database Setup

This guide walks through setting up the D1 database for MTG Deck Builder.

## Prerequisites

1. Cloudflare account
2. Wrangler CLI installed (`npm install -g wrangler`)
3. Logged into Wrangler (`wrangler login`)

## Step 1: Install Worker Dependencies

```bash
npm install -D @cloudflare/workers-types wrangler
```

## Step 2: Create the D1 Database

```bash
# Create the database
wrangler d1 create mtg-deckbuilder

# This will output something like:
# [[d1_databases]]
# binding = "DB"
# database_name = "mtg-deckbuilder"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the `database_id` and paste it into `wrangler.toml`.

## Step 3: Run the Schema Migration

```bash
# Apply the schema to local dev database
wrangler d1 execute mtg-deckbuilder --local --file=./src/database/schema.sql

# Apply the schema to production database
wrangler d1 execute mtg-deckbuilder --file=./src/database/schema.sql
```

## Step 4: Test Locally

```bash
# Start the worker locally
wrangler dev

# Test the API
curl http://localhost:8787/api/health
```

## Step 5: Deploy the Worker

```bash
# Deploy to Cloudflare
wrangler deploy
```

This will give you a URL like `https://mtg-deckbuilder-api.<your-subdomain>.workers.dev`

## Step 6: Configure Frontend

Create a `.env.production` file:

```
VITE_API_URL=https://mtg-deckbuilder-api.<your-subdomain>.workers.dev
```

Or update the worker to use your custom domain.

## API Endpoints

### Users
- `POST /api/users` - Create user
- `GET /api/users/:username` - Get user
- `GET /api/users/:username/collection` - Get user's card collection
- `GET /api/users/:username/decks` - Get user's decks

### Cards
- `POST /api/cards` - Add card to database
- `GET /api/cards/:id` - Get card by ID
- `GET /api/cards?search=query` - Search cards by name
- `POST /api/cards/:id/owners` - Add card to user's collection
- `DELETE /api/cards/:id/owners/:username` - Remove card from collection

### Decks
- `POST /api/decks` - Create deck
- `GET /api/decks/:id` - Get deck with cards and owners
- `PUT /api/decks/:id` - Update deck
- `DELETE /api/decks/:id` - Delete deck
- `POST /api/decks/:id/cards` - Add card to deck
- `DELETE /api/decks/:id/cards/:cardId` - Remove card from deck
- `POST /api/decks/:id/share` - Share deck with user

## Connecting Worker to Pages (Optional)

If you want the API at the same domain as your Pages site:

1. Go to Cloudflare Dashboard > Workers & Pages > mtg-deckbuilder (your Pages project)
2. Settings > Functions > Add binding
3. Or use a custom domain for the worker

## Local Development

For local development, the worker runs on `http://localhost:8787` and the frontend on `http://localhost:5173`.

The frontend API client automatically uses the local URL in development.
