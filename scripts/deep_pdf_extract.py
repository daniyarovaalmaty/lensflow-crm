import pypdf
import re

reader = pypdf.PdfReader('/Users/daniyarovaruslanovna/Downloads/Orthokeratology.pdf')
num_pages = len(reader.pages)
print(f"Total pages: {num_pages}")

# Search for chapters and key formula sections
search_terms = ['formula', 'sag', 'sagittal', 'bozr', 'clearance', 'over-refraction', 'overrefraction', 'jessen', 'mountford', 'alignment zone', 'tear reservoir', 'compression', 'eccentricity', 'toric']

results = {}

for i, page in enumerate(reader.pages):
    text = page.extract_text()
    if not text:
        continue
    text_lower = text.lower()
    found = []
    for term in search_terms:
        if term in text_lower:
            found.append(term)
    if len(found) >= 2:
        results[i + 1] = (found, text)

print(f"Pages with multiple formula/fitting terms: {len(results)}")

# Let's print snippets from top relevant pages
for page_num, (terms, text) in list(results.items())[:20]:
    print(f"\n==========================================")
    print(f"PAGE {page_num} | Terms: {terms}")
    print(f"==========================================")
    lines = text.split('\n')
    for line in lines:
        if any(term in line.lower() for term in ['formula', 'sag', 'bozr', 'clearance', 'jessen', 'mountford', 'equation', '=', 'calc']):
            print(f"  > {line.strip()}")

