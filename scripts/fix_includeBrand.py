import re

with open('src/app/distributor/catalog/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'handlePrintLabel\((printProduct, labelWidth, labelHeight, includePrice), includeBrand\)', r'handlePrintLabel(\1)', content)

with open('src/app/distributor/catalog/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
