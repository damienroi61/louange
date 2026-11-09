"""Convertit les sources de Bibles (domaine public) au format compact utilisé par Louange.
Usage : python3 -I scripts/build-bibles.py <dossier_sources> <dossier_sortie>
Format de sortie : {"id","name","lang","books":[[[verset,...],...chapitres],...66 livres]}
"""
import json, sys, re, os
import xml.etree.ElementTree as ET

src, out = sys.argv[1], sys.argv[2]

def clean(t):
    t = re.sub(r'\s+', ' ', t or '').strip()
    return t

def from_scrollmapper(path):
    d = json.load(open(path, encoding='utf-8'))
    books = []
    for b in d['books'][:66]:
        chs = []
        for c in b['chapters']:
            vs = [clean(v['text']) for v in sorted(c['verses'], key=lambda v: v['verse'])]
            chs.append(vs)
        books.append(chs)
    return books

def from_beblia(path):
    r = ET.parse(path).getroot()
    books = [None] * 66
    for b in r.iter('book'):
        n = int(b.get('number'))
        chs = []
        for c in sorted(b.findall('chapter'), key=lambda c: int(c.get('number'))):
            vs = [clean(v.text) for v in sorted(c.findall('verse'), key=lambda v: int(v.get('number')))]
            chs.append(vs)
        books[n - 1] = chs
    assert all(books), 'livre manquant'
    return books

specs = [
    ('lsg1910', 'Louis Segond 1910', 'fr', from_beblia, 'FrenchBible.xml'),
    ('darby', 'Darby 1885', 'fr', from_scrollmapper, 'FreJND.json'),
    ('kjv', 'King James Version', 'en', from_scrollmapper, 'KJV.json'),
]
os.makedirs(out, exist_ok=True)
for id_, name, lang, fn, file in specs:
    books = fn(os.path.join(src, file))
    nv = sum(len(c) for b in books for c in b)
    with open(os.path.join(out, id_ + '.json'), 'w', encoding='utf-8') as f:
        json.dump({'id': id_, 'name': name, 'lang': lang, 'books': books}, f, ensure_ascii=False, separators=(',', ':'))
    print(id_, len(books), 'livres', nv, 'versets', books[42][2][15][:70])
