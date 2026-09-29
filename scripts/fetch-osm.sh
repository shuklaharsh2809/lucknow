#!/bin/sh
# Re-download the OpenStreetMap extract for old Lucknow (no key needed), then convert it:
#   sh scripts/fetch-osm.sh && python3 scripts/build-osm.py
Q='[out:json][timeout:180];(way["building"](26.8570,80.8985,26.8790,80.9185);relation["building"](26.8570,80.8985,26.8790,80.9185);way["highway"](26.8570,80.8985,26.8790,80.9185);way["natural"="water"](26.8500,80.8900,26.8900,80.9300);relation["natural"="water"](26.8500,80.8900,26.8900,80.9300);way["waterway"](26.8600,80.8900,26.8950,80.9300);way["leisure"](26.8570,80.8985,26.8790,80.9185);way["landuse"](26.8570,80.8985,26.8790,80.9185);way["historic"](26.8570,80.8985,26.8790,80.9185);way["man_made"](26.8570,80.8985,26.8790,80.9185););out body geom;'
curl -s -m 200 -A "lucknow-3d" --data-urlencode "data=$Q" https://lz4.overpass-api.de/api/interpreter -o scripts/osm-raw.json
