import json, glob, os, sys
for f in sorted(glob.glob('_sfsearch/*.json')):
    d = json.load(open(f, encoding='utf-8'))
    print('==', os.path.basename(f), d.get('query'))
    for r in d.get('results', []):
        print('  %-10s %-44s %-16s dur=%-7s dl=%-6s rt=%s/%s' % (
            r['id'], r['title'][:44], r['author'][:16], r.get('duration_seconds'),
            r.get('downloads'), r.get('rating'), r.get('rating_count')))
