"""OpenStreetMap kaynaklı Esentepe kampüs GeoPackage'ını uygulamanın okuduğu JSON'a çevirir.

Kaynak: https://github.com/numanak-b221210105/sau-kampus-qgis-harita (sau_kampus.gpkg)
Veri: © OpenStreetMap katkıda bulunanlar, ODbL 1.0 — https://www.openstreetmap.org/copyright
Koordinat sistemi: TUREF / TM30 (EPSG:5254) → WGS84 enlem/boylam (GRS80, ters Transverse Mercator).

Yalnızca Python standart kütüphanesi kullanılır:
    python3 -I scripts/campus/gpkg_to_json.py <sau_kampus.gpkg> data/campus/esentepe-osm.json
"""

import json
import math
import sqlite3
import struct
import sys

# --- EPSG:5254 (TUREF / TM30) → WGS84 -------------------------------------------------------------
A = 6378137.0
F = 1 / 298.257222101
E2 = F * (2 - F)
EP2 = E2 / (1 - E2)
LON0 = math.radians(30.0)
K0 = 1.0
FE = 500000.0


def tm_inverse(x, y):
    """Snyder (1987) ters Transverse Mercator; kampüs ölçeğinde milimetre altı hata."""
    m = y / K0
    mu = m / (A * (1 - E2 / 4 - 3 * E2**2 / 64 - 5 * E2**3 / 256))
    e1 = (1 - math.sqrt(1 - E2)) / (1 + math.sqrt(1 - E2))
    phi1 = (
        mu
        + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu)
        + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu)
        + (151 * e1**3 / 96) * math.sin(6 * mu)
        + (1097 * e1**4 / 512) * math.sin(8 * mu)
    )
    s, c, t = math.sin(phi1), math.cos(phi1), math.tan(phi1)
    n1 = A / math.sqrt(1 - E2 * s * s)
    t1 = t * t
    c1 = EP2 * c * c
    r1 = A * (1 - E2) / (1 - E2 * s * s) ** 1.5
    d = (x - FE) / (n1 * K0)
    lat = phi1 - (n1 * t / r1) * (
        d**2 / 2
        - (5 + 3 * t1 + 10 * c1 - 4 * c1**2 - 9 * EP2) * d**4 / 24
        + (61 + 90 * t1 + 298 * c1 + 45 * t1**2 - 252 * EP2 - 3 * c1**2) * d**6 / 720
    )
    lon = LON0 + (d - (1 + 2 * t1 + c1) * d**3 / 6 + (5 - 2 * c1 + 28 * t1 - 3 * c1**2 + 8 * EP2 + 24 * t1**2) * d**5 / 120) / c
    return math.degrees(lat), math.degrees(lon)


# --- GeoPackage geometri ikilisi → halkalar ------------------------------------------------------
ENVELOPE_BYTES = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}


def parse_gpkg(blob):
    assert blob[:2] == b"GP", "GeoPackage geometrisi değil"
    flags = blob[3]
    env = ENVELOPE_BYTES[(flags >> 1) & 0b111]
    return parse_wkb(blob, 8 + env)[0]


def parse_wkb(b, o):
    """(geometri, yeni_ofset). Geometri: halka listelerinin listesi (çokgen başına) veya nokta."""
    endian = "<" if b[o] == 1 else ">"
    gtype = struct.unpack_from(endian + "I", b, o + 1)[0]
    o += 5
    has_z = gtype > 1000 and gtype < 2000 or gtype & 0x80000000
    base = gtype % 1000 & 0xFF
    dim = 3 if has_z else 2

    def coords(o, n):
        pts = []
        for _ in range(n):
            vals = struct.unpack_from(endian + "d" * dim, b, o)
            pts.append((vals[0], vals[1]))
            o += 8 * dim
        return pts, o

    if base == 1:
        pts, o = coords(o, 1)
        return ("point", pts[0]), o
    if base == 2:
        n = struct.unpack_from(endian + "I", b, o)[0]
        pts, o = coords(o + 4, n)
        return ("line", pts), o
    if base == 3:
        nr = struct.unpack_from(endian + "I", b, o)[0]
        o += 4
        rings = []
        for _ in range(nr):
            n = struct.unpack_from(endian + "I", b, o)[0]
            pts, o = coords(o + 4, n)
            rings.append(pts)
        return ("polygons", [rings]), o
    if base in (5, 6):
        n = struct.unpack_from(endian + "I", b, o)[0]
        o += 4
        parts = []
        for _ in range(n):
            g, o = parse_wkb(b, o)
            parts.extend(g[1] if g[0] == "polygons" else [[g[1]]])
        return ("polygons", parts), o
    raise ValueError(f"desteklenmeyen WKB tipi {gtype}")


def ring_centroid(ring):
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(ring, ring[1:]):
        cr = x0 * y1 - x1 * y0
        a += cr
        cx += (x0 + x1) * cr
        cy += (y0 + y1) * cr
    if abs(a) < 1e-9:
        return sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)
    return cx / (3 * a), cy / (3 * a)


def to_ll(pt, digits=6):
    lat, lon = tm_inverse(*pt)
    return [round(lat, digits), round(lon, digits)]


def point_in_ring(x, y, ring):
    inside = False
    for (x0, y0), (x1, y1) in zip(ring, ring[1:]):
        if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0:
            inside = not inside
    return inside


def tags(other):
    """OSM other_tags hstore metni → sözlük ('"k"=>"v","k2"=>"v2"')."""
    out = {}
    if not other:
        return out
    for part in other.split('","'):
        part = part.strip('"')
        if '"=>"' in part:
            k, v = part.split('"=>"', 1)
            out[k] = v
    return out


def main(src, dst):
    con = sqlite3.connect(f"file:{src}?mode=ro", uri=True)
    _, boundary = parse_gpkg(con.execute("select geom from kampus_siniri").fetchone()[0])
    outer = boundary[0][0]

    buildings = []
    for osm_id, way_id, name, building, amenity, other, geom in con.execute(
        "select osm_id, osm_way_id, name, building, amenity, other_tags, geom from binalar"
    ):
        if geom is None:
            continue  # kaynakta geometrisi olmayan kayıt
        _, polys = parse_gpkg(geom)
        ring = max((p[0] for p in polys), key=len)
        cx, cy = ring_centroid(ring)
        if not point_in_ring(cx, cy, outer):
            continue  # kampüs dışındaki apartman, AVM vb. uygulamanın kapsamında değil
        t = tags(other)
        buildings.append(
            {
                "osm": f"way/{way_id}" if way_id else f"relation/{osm_id}",
                "name": name,
                "building": building,
                "amenity": amenity,
                "openingHours": t.get("opening_hours"),
                "levels": int(t["building:levels"]) if t.get("building:levels", "").isdigit() else None,
                "center": to_ll((cx, cy)),
                # ~1 m hassasiyet (5 ondalık) şematik çizim için yeterli, dosyayı küçültür
                "outline": [to_ll(p, 5) for p in ring],
            }
        )

    out = {
        "source": "https://github.com/numanak-b221210105/sau-kampus-qgis-harita (sau_kampus.gpkg)",
        "attribution": "© OpenStreetMap katkıda bulunanlar, ODbL 1.0",
        "license": "https://www.openstreetmap.org/copyright",
        "note": "Adlar ve etiketler OSM gönüllülerinindir; eksik veya eski olabilir. Her kayıt osm alanıyla doğrulanabilir.",
        "boundary": [to_ll(p, 5) for p in outer],
        "buildings": sorted(buildings, key=lambda b: (b["name"] is None, b["name"] or "", b["osm"])),
    }
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    named = sum(1 for b in buildings if b["name"])
    print(f"Kampüs sınırı içinde {len(buildings)} bina ({named} adlı) → {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
