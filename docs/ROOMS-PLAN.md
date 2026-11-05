# Rooms plan (work in progress)

Each estate building opens its own themed page with a 3D interior and an interactive toy.
Shared runtime: `src/scripts/stage.js` (renderer, picking, day/night), `src/scripts/sfx.js`
(synthesized sounds, header toggle), `src/scripts/props.js` (procedural models).
Interior models: `public/models/rooms.glb` (KayKit Dungeon Remastered, CC0).

| Page | Room | 3D scene | Interaction |
| --- | --- | --- | --- |
| /archive/ | Keep library | stone hall, bookcase | each post is a book; hover pulls it out, click opens it |
| /category/tech/ | Scriptorium | desk, candle, codex | flip codex pages (one post per spread); click candle to snuff/relight |
| /category/projects/ | Workshop | forge, anvil, gear train | drag gears to work the bellows (forge glows); click anvil for sparks |
| /category/essays/ | Inn | hearth, tables, kegs | roll dice for a random post; click fire to stoke it |
| /tags/ | Market | stalls, banners on a rope | each tag is a banner with generated heraldry; click filters posts; heraldry generator toy |
| /about/ | Rookery | tower top, ravens | ravens look at the cursor and croak; "send a raven" letter form -> mailto |

Home: clicking a building flies the camera in before navigating. Pages use cross-document
view transitions (`@view-transition`).

Status (2026-11-06): all six rooms built and smoke-tested with `node scripts/rooms-test.mjs`.
