import pypdf

reader = pypdf.PdfReader('/Users/daniyarovaruslanovna/Downloads/Orthokeratology.pdf')
for i in range(10):
    page = reader.pages[i]
    print(f"Page {i+1} text length: {len(page.extract_text() or '')}, images count: {len(page.images)}")
