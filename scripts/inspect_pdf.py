import pypdf

reader = pypdf.PdfReader('/Users/daniyarovaruslanovna/Downloads/Orthokeratology.pdf')
print("Total pages in Orthokeratology.pdf:", len(reader.pages))

# Search for keywords or table of contents
keywords = ['MedInVision', 'Medilens', 'подбор', 'примерочн', 'формула', 'торическ', 'эксцентриситет', 'диагностическ', 'набор', 'таблица']
matches = []

for idx, page in enumerate(reader.pages):
    text = page.extract_text()
    if not text:
        continue
    for kw in keywords:
        if kw.lower() in text.lower():
            matches.append((idx + 1, kw, text[:200].replace('\n', ' ')))
            break

print(f"Found {len(matches)} matching pages.")
for m in matches[:15]:
    print(f"Page {m[0]} [{m[1]}]: {m[2]}")
