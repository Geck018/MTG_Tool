/**
 * One-off: add the Mazirek deck to the DB under geck018 via the API.
 * Run: node scripts/add-deck-geck018.mjs
 * Uses production API URL; resolve-list and deck create/add run server-side.
 */

const API_BASE = process.env.VITE_API_URL || 'https://mtg-deckbuilder-api.marriesteyngcko.workers.dev';

const DECK_LIST_RAW = `
1 Mazirek, Kraul Death Priest (EOC) 122
1 Argothian Elder (PLST) USG-233
1 Bristlebane Outrider (ECL) 169
1 Broodrage Mycoid (LCI) 95
1 Cackling Slasher (DSK) 85
1 Cryptid Inspector (DSK) 174
1 Daemogoth Woe-Eater (STX) 175
1 Dawn's Light Archer (ECL) 174
1 Deep Goblin Skulltaker (LCI) 101
1 Dionus, Elvish Archdruid (J25) 52
1 Dwynen's Elite (J25) 654
1 Eclipsed Elf (ECL) 218
1 Ecstatic Awakener (MID) 100
1 Flesh Burrower (DSK) 178
1 Great Forest Druid (ECL) 178
1 Grizzly Ghoul (MID) 226
1 High Perfect Morcant (ECL) 229
1 Homicide Investigator (MKM) 86
1 Hungry Ghoul (FDN) 62
1 Kill-Zone Acrobat (BRO) 106
1 Kraul Swarm (GRN) 73
1 Llanowar Elves (J25) 149
1 Llanowar Visionary (J25) 684
1 Marwyn, the Nurturer (J25) 687
1 Poxwalkers (40K) 49★
1 Razorgrass Invoker (J25) 22
1 Reassembling Skeleton (FDN) 182
1 Rhizome Lurcher (GRN) 196
1 Safewright Cavalry (ECL) 191
1 Shadowheart, Dark Justiciar (CLB) 146
1 Soulcoil Viper (LCI) 120
1 Spiritmonger (IMA) 209
1 Tajuru Pathwarden (J25) 722
1 Thornweald Archer (J25) 724
1 Thraxodemon (BRO) 115
1 Undercity Eliminator (MKM) 108
1 Vinebred Brawler (ECL) 201
1 Virulent Emissary (ECL) 202
1 Viscera Seer (M11) 120
1 Vraan, Executioner Thane (ONE) 114
1 Witherbloom Pledgemage (STX) 249
1 Abrupt Decay (MM3) 146
1 Band Together (J25) 634
1 Blight Rot (ECL) 89
1 Defenestrate (MID) 95
1 Drag to the Roots (DSK) 213
1 Fog (M11) 173
1 Go Forth (J25) 20
1 Tend the Pests (STX) 242
1 Unbury (ECL) 123
1 Unforgiving Aim (ECL) 200
1 Bloodline Bidding (ECL) 91
1 Bounty of Skemfar (J25) 638
1 Culling Ritual (PW25) 4
1 Deadly Brew (STX) 176
1 Diregraf Rebirth (MID) 220
1 Emergency Weld (BRO) 93
1 Harmonize (DD1) 22
1 Overcome (J25) 696
1 Pest Summoning (STX) 211
1 Spider Spawning (INR) 216
1 Bear Trap (DSK) 243
1 Chromatic Lantern (PLG25) 1
1 Dredging Claw (BRO) 119
1 Springleaf Drum (ECL) 260
1 The Soul Stone (PSPM) 66s
1 Transmogrant Altar (BRO) 124
1 Aid from the Cowl (MOC) 290
1 Golgari Germination (RAV) 209
1 Evolving Wilds (ECL) 264
1 Exotic Orchard (40K) 278
14 Forest (PLST) JMP-74
1 Golgari Guildgate (GRN) 249
1 Grim Backwoods (CMA) 254
1 Haunted Mire (DMU) 248
1 Jungle Hollow (FDN) 263
10 Swamp (FDN) 277
1 Thriving Grove (J25) 776
`;

function parseDeckList(text) {
  const lines = text.trim().split(/\r?\n/);
  const cards = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.toLowerCase().includes('sideboard') || trimmed === 'SB:') continue;
    const withSet = trimmed.match(/^(\d+)\s*x?\s*(.+?)\s*\(([A-Za-z0-9]{2,5})\)/);
    if (withSet) {
      cards.push({
        quantity: parseInt(withSet[1], 10),
        name: withSet[2].trim(),
        set: withSet[3].toLowerCase(),
      });
      continue;
    }
    const simple = trimmed.match(/^(\d+)\s*x?\s*(.+)$/);
    if (simple) {
      cards.push({
        quantity: parseInt(simple[1], 10),
        name: simple[2].trim(),
      });
    }
  }
  return cards;
}

async function main() {
  const cards = parseDeckList(DECK_LIST_RAW);
  console.log('Parsed', cards.length, 'lines');

  const resolveRes = await fetch(`${API_BASE}/api/decks/resolve-list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cards }),
  });
  if (!resolveRes.ok) {
    const err = await resolveRes.text();
    throw new Error(`resolve-list failed: ${resolveRes.status} ${err}`);
  }
  const { resolved, not_found } = await resolveRes.json();
  console.log('Resolved', resolved.length, 'cards. Not found:', not_found.length, not_found.slice(0, 5));

  const createRes = await fetch(`${API_BASE}/api/decks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Mazirek Golgari',
      owner_username: 'geck018',
      format: 'casual',
    }),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`create deck failed: ${createRes.status} ${err}`);
  }
  const { id: deckId } = await createRes.json();
  console.log('Created deck id', deckId);

  for (const r of resolved) {
    const addRes = await fetch(`${API_BASE}/api/decks/${deckId}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scryfall_id: r.scryfall_id,
        quantity: r.quantity,
        is_sideboard: false,
        is_commander: false,
      }),
    });
    if (!addRes.ok) {
      console.warn('Failed to add', r.name, await addRes.text());
    }
  }
  console.log('Done. Deck id', deckId, 'for geck018.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
