# Rybna Wyspa — design spec (interview with Jurek, 2026-10-31)

A first-person, desktop-only, co-op fish-farm tycoon in the browser. Everyone in a room builds ONE shared farm on a big low-poly island in the middle of the water. Fish are physics objects. All game text is Polish.

## Rooms and persistence
- One shared farm per room, shared cash, shared block warehouse, shared upgrades.
- Public farm everyone lands on (max 10 players, the 11th goes to public farm #2, #3...) plus private farms joined by code.
- The farm persists on the server (blocks, cash, warehouse, upgrades, fish lying around, album, stats, quests). When nobody is online the machines earn offline at 50% of the measured income rate, capped at 12 h.
- Griefing: anyone can do anything, but every removed block goes to a trash bin for 15 min and anyone can restore it in place; a log shows who did what.

## World
- Big island (~150 x 150 m) from the start, water all around. A fish that falls into the water swims away (lost).
- Fixed shop building near the spawn, fixed sell funnel ("Skup") medium-far (~25 m) from the start build area so conveyors to it are easy. Extra sell funnels are a placeable block, very expensive.
- Day/night cycle and weather (shared per farm): rain, storm, fog, wind, frost, snow, heat, full moon, meteor shower, aurora, rainbow, blood moon.

## Player
- FPP, keyboard + mouse, pointer lock. Low-poly fisherman avatar (boots, vest, cap, chosen colour, nick above head).
- Carrying: a stack of fish in the hands from the start (3, upgradable to 50). Big fish take more slots.
- Upgrades (bought for everyone on the farm): stack size, run speed, magnet radius, jump height, double jump, jetpack, reach, throw power, cooler stack (fish in hands do not spoil), luck, ...

## Building
- Free placement, no grid. Shift snaps (0.5 m grid, 45 deg yaw, conveyor-end magnet). R/T rotate, Z/X tilt.
- Blocks are bought in the shop into the shared warehouse, placed from the hotbar (1-9). Picking a block up returns it to the warehouse (and writes a trash entry for restore).
- Spawners: the cheapest one is manual (click to release a fish), more expensive ones work by themselves; better = faster and rarer fish.
- Transport: conveyors (dry, cheap: fish spoil on them), funnels and water flumes (half-open pipe with flowing water; wet, fish do not spoil; pricier). No pond blocks.
- Ice trays: hold fish, stop spoiling, slowly freeze them -> trait ICE (after leaving the ice the fish does not spoil for a while).
- Machines add traits to fish riding through them (freezer, smoker, radiation chamber, transformer, polisher, ...). Upgraders add a small bonus to the price.
- Construction blocks (floors, walls, rails, pillars, ramps, stairs, glass) and a little decoration.
- Farm fish limit ~400 for performance; when full, spawners pause ("Pełno ryb").

## Fish
- Only Narew species, rarities: pospolita, niepospolita, rzadka, epicka, legendarna, mityczna + sekretna.
- Secret fish (tied to Jurek/Gzowo/Narew): Rakieta GSP, Ognista (Gzowo Labs fire), Wydrukowana (3D-printed PLA), G-Micro (neural net), Potwór z Narwi, Złoty Sum z Gzowa.
- Fish flop on land; species behaviours (eel slips, catfish heavy, pike jumps far, ...).
- Freshness: off ice and out of water a fish slowly loses value (grosze), floor 50%.
- Hovering a fish: white outline, label above it with live value, name, weight, traits.
- Variants Srebrna / Złota / Tęczowa: only rolled at spawn, small chance, multiply the WHOLE price.
- Traits: MEGA many, from the spawn roll, weather exposure (bigger chance during weather) and machines.
- Price = base(species, weight) x (1 + sum of trait bonuses + sum of upgrader bonuses) x variant x freshness x rebirth multiplier. A trait with multiplier m adds (m - 1) x base; traits do not multiply each other.

## Progression and social
- Farm levels from lifetime earnings unlock spawners/machines/blocks.
- Fish album (species, variants, traits discovered), quests (shared, cash rewards), rebirth by vote of everyone online (resets everything except album and stats, permanent price multiplier).
- Farm ranking (zł/min) and per-player stats + action log. No chat, no emotes.
- Calm music + real nature recordings.

## Tech
- three.js 0.187 + Rapier compat 0.21 (ES modules from CDN, no build).
- Leader client (oldest online player) simulates all fish physics and streams awake fish over WebRTC data channels (star around the leader); RTDB (shared `gzowos-games`, branch `rybnaWyspa/`, Spark plan) is the source of truth for persistent state, presence, leader election and signaling, and a low-rate relay fallback when P2P fails. `?realm=test` uses `rybnaWyspaTest/`.
- No Firebase = solo offline farm saved in localStorage.
