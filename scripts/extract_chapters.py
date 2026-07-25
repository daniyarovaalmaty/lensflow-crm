import pypdf

reader = pypdf.PdfReader('/Users/daniyarovaruslanovna/Downloads/Orthokeratology.pdf')

for i, page in enumerate(reader.pages):
    text = page.extract_text()
    if not text:
        continue
    for line in text.split('\n'):
        if line.strip().isupper() and len(line.strip()) > 5 and len(line.strip()) < 60:
            if any(w in line for w in ['CHAPTER', 'DESIGN', 'FITTING', 'CALCULATION', 'PROCEDURE', 'FORMULA', 'SELECTION', 'TRIAL', 'JESSEN', 'REVERSE', 'GEOMETRY']):
                print(f"Page {i+1}: {line.strip()}")

