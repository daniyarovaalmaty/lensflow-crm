import re

with open('scripts/extracted_formulas_mountford.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Split by pages
pages = text.split('=== PAGE ')

print(f"Total pages extracted: {len(pages)-1}")

for page in pages[1:]:
    lines = page.split('\n')
    page_num = lines[0].split(' ')[0]
    content = "\n".join(lines[1:])
    
    # Check for equations, formulas, sag calculations, compression factor, over-refraction
    keywords = ['equation', 'formula', 'sag', 'jessen', 'compression', 'bozr', 'over-refraction', 'apical clearance', 'tear reservoir', 'toric']
    matches = [line.strip() for line in lines if any(kw in line.lower() for kw in keywords) and len(line.strip()) > 10]
    
    if matches:
        print(f"\n--- PAGE {page_num} ({len(matches)} matches) ---")
        for m in matches[:8]:
            print(f"  • {m}")

