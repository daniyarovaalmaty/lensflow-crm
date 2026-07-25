import pypdf

reader = pypdf.PdfReader('/Users/daniyarovaruslanovna/Downloads/Orthokeratology.pdf')
print("Pages count:", len(reader.pages))

# Print pages 2-10 text to see table of contents or introductory pages
for i in range(1, 12):
    text = reader.pages[i].extract_text()
    print(f"=== PAGE {i+1} ===")
    print(text[:1000])

