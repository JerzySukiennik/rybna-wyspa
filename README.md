# Rybna Wyspa

A first-person co-op fish farm in the browser. Everyone in a room shares one small low-poly island in the middle of the Narew: place fish spawners, conveyor belts, water flumes, ice trays and machines, carry stacks of fish and sell them into the funnel. Fish are physics objects with rarities, weights, freshness and around fifty traits from weather and machines.

The game is in Polish.

## Run locally

Any static server works, for example:

```bash
python3 -m http.server 8740
```

Then open `http://localhost:8740`. Useful URL flags: `?realm=test` (separate database branch), `?fps` (frame counter), `?debug` (F gives money), `?phase=0.2&weather=deszcz` (fix time of day and weather for screenshots).

## How it works

- three.js 0.187 and Rapier 0.21 as ES modules from a CDN, no build step.
- One player per room (the leader) simulates all fish and streams moving bodies over WebRTC data channels; everybody else interpolates. The farm itself (cash, blocks, warehouse, upgrades, album, quests, log, trash) lives in Firebase Realtime Database, so it survives everyone leaving and earns offline at half rate for up to 12 hours.
- Without a connection the game runs solo and saves to localStorage.
- All models are procedural (`src/models/`), all UI is HTML/CSS in a paper fishing-licence style.

## Credits

Sound and music credits are in `assets/audio/*/CREDITS.md` and in the in-game Autorzy tab.
