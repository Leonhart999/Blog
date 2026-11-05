# Leonhart Manor

A medieval castle and manor themed blog, built with [Astro](https://astro.build/) and
[three.js](https://threejs.org/). Published at https://leonhart999.github.io/Blog/.

The home page is a floating hex-tile estate. Each building leads to a part of the blog:

| Building | Section | Path |
| --- | --- | --- |
| Keep (城堡) | Archive | `/archive/` |
| Scriptorium (缮写室) | Tech posts | `/category/tech/` |
| Workshop (工坊) | Project notes | `/category/projects/` |
| Inn (旅店) | Essays | `/category/essays/` |
| Market (集市) | Tags | `/tags/` |
| Rookery (信鸦塔) | About | `/about/` |

Each of these pages opens with its own 3D interior and toy (see `docs/ROOMS-PLAN.md`):
a bookcase where every post is a book, a codex whose pages you flip, a forge driven by a
gear train, dice that pick a post, banners with generated heraldry that filter by tag, and
ravens that carry your letter. Clicking a building on the home page flies the camera in.
Sound effects are synthesized with Web Audio and can be muted from the header.

## Writing a post

Add a Markdown file to `src/content/posts/`. The file name becomes the URL (`my-post.md` ->
`/Blog/posts/my-post/`), so use lowercase English words joined by hyphens.

```yaml
---
title: Post title
description: One-line summary shown in lists and RSS
date: 2026-11-05
updated: 2026-11-06      # optional
category: tech           # tech | projects | essays
tags: [ROS2, SLAM]
draft: false             # true: only visible in `npm run dev`
---
```

Posts support GitHub-flavoured Markdown, syntax-highlighted code blocks, and KaTeX math
(`$inline$` and `$$display$$`). See `src/content/posts/writing-cheatsheet.md` for every format.

## Commands

```bash
npm install          # once
npm run dev          # local preview at http://localhost:4321/Blog/
npm run build        # static site into dist/
npm run preview      # serve dist/ locally
```

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to
GitHub Pages. In the repository settings, Pages must use "GitHub Actions" as its source.

## Where things live

- `src/consts.ts`: blog name, author, sections, map buildings, navigation.
- `src/styles/castle.css`: the theme (day: vellum and oak; night: candlelit hall).
- `src/scripts/estate.js`: the 3D estate. The island rock, waterfall, banner and ravens are generated in code.
- `src/scripts/seal.js`: the procedural 3D wax seal on the About page.
- `src/scripts/stage.js`, `src/scripts/rooms/*.js`: the section interiors; `props.js` holds the procedural models, `sfx.js` the sounds.
- `src/lib/heraldry.js`: deterministic coat-of-arms generator used by the Market page.
- `public/models/rooms.glb`: KayKit Dungeon Remastered models used by the interiors.
- `public/models/estate.glb`: KayKit models used by the estate, merged and meshopt-compressed.
- `public/icons.svg`: icon sprite built from game-icons.net SVGs.
- `scripts/`: asset build tools and screenshot helpers.

All links go through `url()` in `src/lib/posts.ts`, which adds the `/Blog` base path. Hard-coded
absolute links such as `/archive/` break on GitHub Pages.

## Rebuilding the 3D models or icons

The third-party sources are not committed. Download them into `.vendor-src/`:

- KayKit Medieval Hexagon Pack: https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0
  (extract so that `.vendor-src/kaykit/addons/kaykit_medieval_hexagon_pack/Assets/gltf` exists)
- KayKit Dungeon Remastered: https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0
  (extract so that `.vendor-src/dungeon/addons/kaykit_dungeon_remastered/Assets/gltf` exists)
- game-icons: https://github.com/game-icons/icons (SVGs saved as `.vendor-src/game-icons/<author>_<name>.svg`)

Then run `npm run models` for both GLBs, or `python -I scripts/build-icons.py .vendor-src/game-icons public/icons.svg name=file.svg ...`
for the sprite. The list of models is in `scripts/build-models.mjs`.

## Credits

- 3D models: KayKit Medieval Hexagon Pack and KayKit Dungeon Remastered by Kay Lousberg, CC0.
- Icons: game-icons.net by Lorc and Delapouite, CC BY 3.0.
- Fonts: Cinzel, Cinzel Decorative, EB Garamond, SIL Open Font License (licence files in `src/fonts/`).
- three.js, MIT. KaTeX, MIT.
