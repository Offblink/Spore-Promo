import json, io, sys

LIB = r"data\skills\video-shotcraft\gallery\api\library.json"
lib = json.load(io.open(LIB, encoding="utf-8"))
cards = lib["cards"]
names = {c.get("name") for c in cards}
style_keys = {s.get("key") for c in cards for s in (c.get("styles") or [])}

WANT = ["crash-zoom-punch", "type-and-filter", "list-reveal", "ui-strip-away-outro", "row-embed"]

print("library.json  revision=%s  generatedAt=%s" % (lib["revision"], lib["generatedAt"]))
print("stats: %s" % json.dumps(lib["stats"], ensure_ascii=False))
print("cards=%d  styleKeys=%d" % (len(names), len(style_keys)))
ok = 0
for n in WANT:
    hit_name = n in names
    hit_key = n in style_keys
    cat = next((c.get("category") for c in cards if c.get("name") == n), None)
    nstyles = len(next((c.get("styles") for c in cards if c.get("name") == n), []) or [])
    if hit_name and hit_key:
        ok += 1
    print("%-4s %-22s card=%-5s styleKey=%-5s category=%-14s styles=%d"
          % ("OK" if (hit_name and hit_key) else "MISS", n, hit_name, hit_key, cat, nstyles))
print("---- checked=%d  ok=%d  miss=%d" % (len(WANT), ok, len(WANT) - ok))
sys.exit(0 if ok == len(WANT) else 1)
