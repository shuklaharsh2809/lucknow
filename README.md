# Shaam-e-Awadh · Old Lucknow in 3D

A walkable three.js recreation of old Lucknow. It's free to run, with no API keys and no paid services.

**What is real**
- **The city plan is real.** Streets, lanes, the Gomti and its bridges, the parks and the mapped buildings come from OpenStreetMap, bundled in `src/data/lucknow.json`. The unmapped houses are filled in along the real street frontages, facing the street.
- **The monuments stand at their true positions, orientations and footprints**, modelled from Wikimedia Commons photographs:
  - Rumi Darwaza
  - Bara Imambara: hall, rooftop Bhool Bhulaiya maze, gates and the Asfi Mosque
  - Husainabad Clock Tower (67 m), Ghanta Ghar Talab, the Picture Gallery and Satkhanda
  - Chota Imambara
  - Akbari Darwaza and the Chowk bazaar
  - Jama Masjid
- **Surfaces use photo-scanned CC0 textures** from Poly Haven, in `public/tex/`.

**Places (keys 1–5):** Bara Imambara · Rumi Darwaza · Husainabad Clock Tower · Chota Imambara · Chowk Bazaar.
**Time of day (T):** morning (default, lights the most facades), afternoon, evening, night (the "Palace of Lights").

## Controls
| Desktop | Touch |
|---|---|
| `WASD` walk · `Shift` run · `Space` jump | drag the left half to walk |
| mouse look (click to capture, `Esc` to release) | drag the right half to look |
| `F` fly (`Space`/`C` up/down) | ✈︎ and ⤒ buttons |
| `1`–`5` places · `T` time · `M` map · `N` sound | the place bar and buttons |

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```
Debug URL parameters: `?place=3`, `?time=night`, `?q=low|medium|high`, `?auto` (skip the intro), `?shot=p2` (frame place 2 for a screenshot).

## Update the map data
```bash
sh scripts/fetch-osm.sh      # re-download the OpenStreetMap extract (Overpass, no key)
python3 scripts/build-osm.py # convert it to src/data/lucknow.json
```

## Deploy (Vercel, free hobby plan)
```bash
npx vercel login
npx vercel --prod
```

## Credits
- Map data © OpenStreetMap contributors (ODbL)
- Textures: Poly Haven (CC0)
- Monument references: Wikimedia Commons photographers (CC BY-SA and public domain). The photos were used only as modelling reference and are not included in the project.
