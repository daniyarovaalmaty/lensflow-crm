import pypdf

reader = pypdf.PdfReader('/Users/daniyarovaruslanovna/Downloads/Orthokeratology.pdf')

pages_to_extract = list(range(71, 106)) + list(range(140, 174))

with open('scripts/extracted_formulas_mountford.txt', 'w', encoding='utf-8') as f:
    for page_num in pages_to_extract:
        text = reader.pages[page_num - 1].extract_text()
        f.write(f"\n\n=== PAGE {page_num} ===\n\n")
        f.write(text or "[No text]")

print("Saved pages text to scripts/extracted_formulas_mountford.txt")
