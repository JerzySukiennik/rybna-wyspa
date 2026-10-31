# Models brief — Rybna Wyspa

Low-poly, flat-shaded, vertex-coloured procedural models generated in JavaScript with three.js 0.187 (`https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js`). No textures, no external model files. Stylised but recognisable: a Polish angler must name every species from silhouette and colouring. All models share one style: same facet density, same eye style, same fin thickness, natural colours with gentle saturation, darker back shading to a lighter belly.

## Contract (the game imports these files; do not change signatures)

### `src/models/fish.js`
- `export const FISH_IDS` — array of the 34 ids below, in this order.
- `export function fishGeometry(id)` -> `THREE.BufferGeometry`, built once per id (cache it):
  - non-indexed, flat shading (per-face normals);
  - attributes `position`, `normal`, `color` (linear floats: build colours with `new THREE.Color('#hex')`, three converts sRGB hex to linear), `aBend` (float, 0 at the nose tip, 1 at the tail fin tip, used by the game shader to bend the body when swimming/flopping), `aGlow` (float 0..1, emissive mask: eyes of the monster, G-Micro network, fire fish, rocket nozzle; 0 everywhere else);
  - nose toward +X, back toward +Y, flanks toward +Z/-Z; total length exactly 1.0 (x from -0.5 at the tail fin tip to +0.5 at the nose); bounding box centred on y = 0 and z = 0;
  - 150-700 triangles per fish (sturgeon, catfish and monster up to 1000);
  - fins are thin closed wedges or two back-to-back faces with opposite winding, so a FrontSide material shows them from both sides;
  - eyes on both sides (dark pupil, lighter iris ring where the species has a coloured eye).
- `export function fishDims(id)` -> `{ h, w }` = max body height and max body thickness (without fins), as fractions of length 1.0, for the physics collider.

### `src/models/avatar.js`
- `export function buildAvatar(color)` -> `THREE.Group` — a low-poly Polish river angler: dark green rubber boots, khaki/olive trousers, fishing vest with pockets in `color` (accepts hex number or string), long-sleeve shirt, simple friendly head (no hair detail needed), cap in `color`. Height 1.8 m, feet at y = 0, facing -Z. Named children: `body` (torso + hips), `head` (pivot at the neck), `armL`, `armR` (pivot at the shoulder, arm hangs along -Y), `legL`, `legR` (pivot at the hip). Rotating `armL.rotation.x` or `legR.rotation.x` must swing that limb naturally. Up to 1200 triangles. Vertex colours, `MeshLambertMaterial({ vertexColors: true, flatShading: true })` is enough.
- `export function buildViewHands()` -> `THREE.Group` — first-person forearms with hands in shirt sleeves, palms up as if carrying a stack of fish in front of the chest, for a camera at the origin looking down -Z (place them about 0.35-0.55 m in front, 0.25-0.4 m below the eye).

### `src/models/deco.js`
- `export const DECO_IDS` and `export function decoGeometry(id)` -> `THREE.BufferGeometry` (flat, vertex colours, metres, origin at the base centre, y up). Ids: `willow` (wierzba, Narew bank), `birch`, `alder` (olcha), `pine`, `bush`, `reeds` (clump of trzcina), `cattail` (pałka wodna), `rock_s`, `rock_m`, `rock_l`, `grass` (tuft), `flowers`, `log`, `stump`, `lily` (water lily pad with flower, sits at y = 0 water level), `boat` (small wooden rowing boat, ~3 m), `pier` (wooden pier section 2 m x 4 m on posts, deck top at y = 0.6). Trees 4-9 m tall, up to 600 tris each; small items under 150.

### Viewer: `Niepotrzebne/models/viewer.html`
A page that shows every model on a neutral light-grey ground with a sky-ish background, hemisphere + warm directional light and soft shadows: fish laid out in a grid on their side and standing (two rows per fish, side view and 3/4 view), each with a label (Polish name, rarity, triangle count), the avatar (static and with a walking swing), the view hands, and all deco items. `aGlow` should visibly glow (add it as emissive). Orbit with drag, render only on change. URL params: `?sheet=fish1` (first 17 fish), `?sheet=fish2` (the rest), `?sheet=avatar`, `?sheet=deco` lay out a static contact sheet sized for a 1600x1000 screenshot. Serve with `python3 -m http.server 8742 --directory "/Users/jurek/Downloads/Claude/Projects/Rybna Wyspa"` and open `http://localhost:8742/Niepotrzebne/models/viewer.html?sheet=fish1`. Kill the server when you are done.

Screenshots: headless Chrome through playwright-core, e.g. `const { createRequire } = await import('node:module'); const require = createRequire('/Users/jurek/openclaw/node_modules/'); const { chromium } = require('playwright-core');` with `executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`, args `['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']`. Save to `Niepotrzebne/models/shots/`. Look at every screenshot yourself (Read the PNG) and fix what looks wrong before you report. Keep runs short (the Mac must stay quiet).

## Species (id — Polish name — what makes it recognisable)
Common:
1. `ukleja` — Ukleja (bleak): small slender, very silvery bright flanks, blue-green back, upturned mouth, long anal fin, forked tail.
2. `ploc` — Płoć (roach): silver, blue-grey back, RED eyes, orange-red pelvic and anal fins, moderately deep body.
3. `kielb` — Kiełb (gudgeon): small bottom fish, round belly, one pair of barbels at the mouth, row of dark blotches along the flank, sandy brown-gold.
4. `jazgarz` — Jazgarz (ruffe): small perch-like, big eyes, single spiny dorsal fin with dark dots, mottled olive-brown, slimy.
5. `okon` — Okoń (perch): olive-green with 6-7 dark vertical bars, humped back, spiny first dorsal fin with a black spot at its rear, orange-red pelvic and anal fins.
6. `krap` — Krąp (silver bream): deep, laterally compressed, silver, reddish base of pectoral and pelvic fins, big eye.
Uncommon:
7. `leszcz` — Leszcz (bream): very deep flat body like a plate, bronze-gold, dark grey fins, small head, long anal fin.
8. `wzdrega` — Wzdręga (rudd): golden-brassy flanks, bright red fins, upturned mouth, deep body.
9. `karas` — Karaś (crucian carp): deep rounded body, bronze with green tint, long rounded dorsal fin, no barbels.
10. `jelec` — Jelec (dace): slender silver, yellowish fins, concave dorsal and anal fin edges, small mouth.
11. `klen` — Kleń (chub): thick cylindrical body, big broad head and mouth, dark-edged scales forming a net pattern, convex orange-red anal and pelvic fins, dark tail.
12. `lin` — Lin (tench): thick slimy olive-green to bronze, red-orange eyes, rounded fins, tiny barbels, thick tail root.
13. `piskorz` — Piskorz (weatherfish): small eel-like, brown with dark lengthwise stripes, ring of short barbels around the mouth, rounded tail.
Rare:
14. `jaz` — Jaź (ide): stocky, silver-golden, reddish fins, small head.
15. `karp` — Karp (common carp): deep, golden-bronze with big visible scales (facet pattern), 4 barbels, long dorsal fin, orange-tinted lower fins.
16. `bolen` — Boleń (asp): elongated predator, large mouth reaching the eye, silver, bluish back, reddish lower fins.
17. `brzana` — Brzana (barbel): elongated, flat belly, underslung mouth with 4 thick barbels, bronze-green, orange-red lower fins.
18. `certa` — Certa (vimba): fleshy snout overhanging the mouth, silver with dark back, orange belly tint.
19. `amur` — Amur (grass carp): elongated torpedo, big olive-silver scales with dark edges, wide flat head.
Epic:
20. `sandacz` — Sandacz (zander): elongated, two separate dorsal fins (first spiny with dark spots), large glassy eyes, visible fang teeth, grey-green with faint dark vertical bars.
21. `szczupak` — Szczupak (pike): long torpedo, duck-bill snout, dorsal and anal fins far back near the tail, green with rows of light yellow bean-shaped spots, white belly.
22. `mietus` — Miętus (burbot): elongated, flattened head, ONE chin barbel, two dorsal fins (second very long), mottled brown-yellow marbling.
23. `wegorz` — Węgorz (eel): snake-like, one continuous fin from back over the tail to the belly, small pectoral fins, dark olive back, yellowish belly.
Legendary:
24. `troc` — Troć wędrowna (sea trout): streamlined silver, black X-shaped spots on the upper half, small adipose fin, square tail.
25. `pstrag` — Pstrąg potokowy (brown trout): golden-brown, red spots with white rings and black spots, adipose fin.
26. `sum` — Sum (wels catfish): huge, scaleless, broad flat head, very wide mouth, 2 long whip barbels on the upper jaw and 4 short below, tiny dorsal fin, very long anal fin to the tail, dark mottled olive-black, pale belly.
Mythic:
27. `losos` — Łosoś atlantycki (Atlantic salmon): silver streamlined, small black spots above the lateral line, adipose fin, slightly forked tail.
28. `jesiotr` — Jesiotr ostronosy (sturgeon): long shark-like, pointed snout with 4 barbels under it, 5 rows of bony diamond scutes (back, two flanks, two belly edges), heterocercal tail (upper lobe much longer), grey-brown back, white belly.
Secret (fun, still clearly fish):
29. `rakieta` — Rakieta GSP: fish-rocket hybrid, white body with nose-cone head, 3-4 black swept rocket fins at the tail, a nozzle at the tail end (aGlow inside), small fish eyes and pectoral fins, a black band around the body.
30. `ognista` — Ognista: a fish made of flame, orange-yellow body with flame-tongue jagged dorsal and tail fins, strong aGlow gradient (yellow core), no dark colours except the eye.
31. `wydrukowana` — Wydrukowana: a 3D-printed carp-like fish built from stacked horizontal slices (visible stepped layers), one filament colour (Bambu green #00AE42), slightly glossy look is done by the game, you only make the geometry and colour.
32. `gmicro` — G-Micro: dark navy low-poly fish with a glowing cyan network: nodes on vertices and thin edges over the surface (aGlow = 1 on network parts).
33. `zloty_sum` — Złoty Sum z Gzowa: catfish shape like `sum` but rich gold colour, longer whiskers, a little more majestic.
34. `potwor` — Potwór z Narwi: monstrous huge fish, dark green-black, spiky dorsal crest, big jaw with teeth, glowing yellow eyes (aGlow), tentacle-like barbels, armour plates.
