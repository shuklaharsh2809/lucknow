"""Convert the raw OpenStreetMap extract into the compact local-metre data the game loads.

Local frame: origin at Rumi Darwaza, +X east, +Z south (so north is -Z), 1 unit = 1 m.
Data (c) OpenStreetMap contributors, ODbL.
"""
import json, math, os

LAT0, LON0 = 26.8712234, 80.9122124
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 110574
BOUNDS = (-1400, -800, 850, 1250)  # x0, z0, x1, z1

def xy(p):
    return (round((p['lon'] - LON0) * KX, 1), round(-(p['lat'] - LAT0) * KZ, 1))

WIDTH = {'primary': 13, 'primary_link': 8, 'secondary': 11, 'secondary_link': 7, 'tertiary': 8, 'tertiary_link': 6,
         'residential': 5.5, 'living_street': 4, 'service': 3.6, 'unclassified': 5, 'pedestrian': 4, 'footway': 2, 'path': 1.6, 'steps': 2.5}

# Monuments are modelled by hand, so their footprints only reserve space.
MONUMENTS = {'Rumi Gate', 'Asfi Mosque', 'Bara Imambara', 'Husainabad Clock Tower', 'Jama Masjid'}

here = os.path.dirname(__file__)
raw = json.load(open(os.path.join(here, 'osm-raw.json')))['elements']

def inside(pts, pad=150):
    x0, z0, x1, z1 = BOUNDS
    return any(x0 - pad < x < x1 + pad and z0 - pad < z < z1 + pad for x, z in pts)

def geom(e):
    if e.get('geometry'):
        return [[xy(p) for p in e['geometry'] if p]]
    rings = []
    for m in e.get('members', []):
        if m.get('role') in ('outer', '') and m.get('geometry'):
            rings.append([xy(p) for p in m['geometry'] if p])
    return rings

roads, water, parks, buildings = [], [], [], []
areas = {}  # named monument compounds (outlines for boundary walls)
for e in raw:
    t = e.get('tags', {})
    for pts in geom(e):
        if len(pts) < 2 or not inside(pts):
            continue
        flat = [c for p in pts for c in p]
        if ('historic' in t or t.get('tourism') == 'attraction') and 'building' not in t and t.get('name'):
            areas[t['name']] = flat
            continue
        if 'highway' in t and t['highway'] in WIDTH and e['type'] == 'way':
            roads.append({'k': t['highway'], 'w': WIDTH[t['highway']], 'n': t.get('name', ''), 'p': flat,
                          'b': 1 if t.get('bridge') == 'yes' else 0})
        elif t.get('natural') == 'water' or t.get('landuse') == 'basin':
            water.append({'n': t.get('name', ''), 'p': flat})
        elif t.get('leisure') in ('park', 'garden', 'pitch') or t.get('landuse') in ('grass', 'meadow'):
            parks.append({'n': t.get('name', ''), 'p': flat})
        elif 'building' in t:
            name = t.get('name', '')
            lv = t.get('building:levels')
            h = t.get('height')
            buildings.append({'n': name, 'm': 1 if name in MONUMENTS else 0, 'p': flat,
                              'l': float(lv) if lv and lv.replace('.', '').isdigit() else None,
                              'h': float(h) if h and h.replace('.', '').isdigit() else None,
                              'k': t.get('building', 'yes')})

out = {'bounds': BOUNDS, 'origin': [LAT0, LON0], 'roads': roads, 'water': water, 'parks': parks, 'buildings': buildings, 'areas': areas,
       'attribution': '© OpenStreetMap contributors (ODbL)'}
path = os.path.join(here, '..', 'src', 'data', 'lucknow.json')
json.dump(out, open(path, 'w'), separators=(',', ':'))
print(f"roads {len(roads)}, water {len(water)}, parks {len(parks)}, buildings {len(buildings)} -> {os.path.getsize(path)//1024} KB")
