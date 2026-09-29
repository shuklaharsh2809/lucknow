# Shaam-e-Awadh · An Evening in Lucknow

A walkable three.js recreation of old Lucknow at golden hour. Everything is procedural: there are no 3D models, textures or audio files.

**Places (keys 1–5)**
1. **Bara Imambara**: two gateways, the Asfi Mosque, and a vaulted hall you can walk into. Take the east staircase up to the rooftop **Bhool Bhulaiya** maze.
2. **Rumi Darwaza**: the cusped "Turkish Gate". The road passes through it.
3. **Husainabad Clock Tower**: its hands show the in-game time and it chimes the quarters. Next to it are the Satkhanda tower, the stepped tank and the baradari.
4. **Chota Imambara**: the gilded dome, the garden channel with fountains, and the two small Taj replicas.
5. **Chowk Bazaar**: through the Akbari Darwaza are chikan, attar, kebab and chai stalls under string lights.

Also in the scene: kites and pigeon flocks overhead, cycle-rickshaws, people walking, the Gomti riverfront, and a Web Audio soundscape (city hum, crowd, birds, rickshaw bells, a tanpura drone).

## Controls
| Desktop | Touch |
|---|---|
| `WASD` walk · `Shift` run · `Space` jump | drag left half to walk (drag further to run) |
| mouse look (click to capture, `Esc` to release) | drag right half to look |
| `F` fly (`Space`/`C` up/down) | ✈︎ and ⤒ buttons |
| `1`–`5` teleport · `M` map · `N` sound | tap the place bar |

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

Debug URL params: `?place=3` sets the starting place, `?q=low|medium|high` sets quality, `?auto` skips the intro, and `?shot=x,y,z,yaw,pitch` fixes the camera.

## Deploy (Vercel)
```bash
npx vercel login
npx vercel --prod
```
Vercel detects Vite automatically. `vercel.json` sets long-lived caching on hashed assets.

## Code map
- `src/core/`: materials and procedural textures, the geometry `Builder` (merges geometry per material and registers colliders), the Awadhi architecture kit (pointed and cusped arches, onion domes, chhatris, minarets, the twin-fish emblem), physics, player, input
- `src/landmarks/`: one file per landmark
- `src/world/`: layout and place data, sky and lighting, ground, instanced city fill, street life
- `src/audio/soundscape.js`, `src/ui/hud.js`
