import json, os
p = os.path.join('public', 'audio', 'sfx', 'audio-manifest.json')
m = json.load(open(p, encoding='utf-8'))
print('top keys:', list(m.keys()))
items = m.get('items') or m.get('files') or m.get('sounds') or []
if isinstance(m, list):
    items = m
print('count', len(items))
if items:
    print('item keys:', list(items[0].keys()))
    a = items[0].get('analysis') or {}
    print('analysis keys:', list(a.keys()))
for it in items:
    a = it.get('analysis') or {}
    print('%-18s dur=%-8s peak_time=%-8s peak=%-7s rms=%-7s lic=%s' % (
        it.get('filename') or it.get('file'), a.get('duration_seconds') or a.get('duration'),
        a.get('peak_time_seconds') or a.get('energy_peak_seconds') or a.get('peak_time'),
        a.get('sample_peak') or a.get('max_volume'), a.get('overall_rms') or a.get('rms'),
        (it.get('license') or {}).get('url') if isinstance(it.get('license'), dict) else it.get('license_url')))
