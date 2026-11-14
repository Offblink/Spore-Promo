import json
m = json.load(open('public/audio/sfx/audio-manifest.json', encoding='utf-8'))
for a in m['assets']:
    an = a['analysis']
    print('%-18s dur=%-7.3f peakLag=%-6.3f pk=%-9s rms=%-9s %s' % (
        a['file'], an['duration_seconds'], an['energy_peak_seconds'],
        an['sample_peak_dbfs'], an['rms_dbfs'], a['license']))
