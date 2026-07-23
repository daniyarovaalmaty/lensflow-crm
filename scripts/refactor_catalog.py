import re

with open('src/app/distributor/catalog/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove brand and model from ProductForm definition
content = re.sub(r'\s*brand:\s*string\s*\|\s*null;', '', content)
content = re.sub(r'\s*model:\s*string\s*\|\s*null;', '', content)

# 2. handlePrintLabel signature
content = re.sub(
    r'(const handlePrintLabel = \(\n.*?product: OpticProduct,\n.*?widthMm: number = 58,\n.*?heightMm: number = 30,\n.*?incPrice: boolean = true),\n.*?incBrand: boolean = true\n\s*\) => {',
    r'\1\n    ) => {',
    content,
    flags=re.DOTALL
)

# 3. Label print logic - remove incBrand from html template
content = re.sub(r"\$\{incBrand \? `<div class=\"brand-tail\">.*?</div>` : ''\}\s*", '', content)
content = re.sub(r"\$\{incBrand \? `<div class=\"brand\">.*?</div>` : ''\}\s*", '', content)
content = re.sub(r"\s*\.brand-tail\s*{[^}]+}", '', content)
content = re.sub(r"\s*\.brand\s*{[^}]+}", '', content)

# 4. generateZpl and generateTspl - remove incBrand parameter and logic
content = re.sub(r'(const generateZpl = \(product: OpticProduct, incPrice: boolean), incBrand: boolean(\) => {)', r'\1\2', content)
content = re.sub(r'(const generateTspl = \(product: OpticProduct, incPrice: boolean), incBrand: boolean(\) => {)', r'\1\2', content)
content = re.sub(r'(const generateZplStandard = \(product: OpticProduct, widthMm: number, heightMm: number, incPrice: boolean), incBrand: boolean(\) => {)', r'\1\2', content)
content = re.sub(r'(const generateTsplStandard = \(product: OpticProduct, widthMm: number, heightMm: number, incPrice: boolean), incBrand: boolean(\) => {)', r'\1\2', content)

content = re.sub(r'\s*const brand = .*?\.toUpperCase\(\);', '', content)

content = re.sub(r'\s*if \(incBrand\) \{\s*zpl \+= `\^FT.*?brand.*?FS\\r\\n`;\s*textY \+= 20;\s*\}', '', content)
content = re.sub(r'\s*if \(incBrand\) \{\s*tspl \+= `TEXT.*?brand.*?\\r\\n`;\s*textY \+= 20;\s*\}', '', content)

content = re.sub(r'\s*if \(incBrand\) \{\s*zpl \+= `\^FT.*?brand.*?FS\\r\\n`;\s*currentY \+= 25;\s*\}', '', content)
content = re.sub(r'\s*if \(incBrand\) \{\s*tspl \+= `TEXT.*?brand.*?\\r\\n`;\s*currentY \+= 25;\s*\}', '', content)

# 5. Remove includeBrand argument from generateZpl/generateTspl calls
content = re.sub(r'(generateZpl\(printProduct, includePrice), includeBrand(\))', r'\1\2', content)
content = re.sub(r'(generateTspl\(printProduct, includePrice), includeBrand(\))', r'\1\2', content)
content = re.sub(r'(generateZplStandard\(printProduct, labelWidth, labelHeight, includePrice), includeBrand(\))', r'\1\2', content)
content = re.sub(r'(generateTsplStandard\(printProduct, labelWidth, labelHeight, includePrice), includeBrand(\))', r'\1\2', content)

# 6. CSV Export logic
content = content.replace("Бренд;Модель;", "")
content = re.sub(r'\s*\'Бренд\': \'brand\',', '', content)
content = re.sub(r'\s*\'brand\': \'brand\',', '', content)
content = re.sub(r'\s*\'Модель\': \'model\',', '', content)
content = re.sub(r'\s*\'model\': \'model\',', '', content)

content = re.sub(r'(const csvRow = \[\s*p\.name,\s*)p\.brand \|\| \'\',\s*p\.model \|\| \'\',\s*', r'\1', content)

# 7. Form UI - remove Brand + Model section
content = re.sub(r'\{\/\*\s*Brand \+ Model \(only for products\)\s*\*\/\}[\s\S]*?\{\/\*\s*SKU \+ Barcode\s*\*\/\}', '{/* SKU + Barcode */}', content)

# 8. Detail modal - remove brand line
content = re.sub(r'\{detailProduct\.brand && \([\s\S]*?<\/p>\n\s*\)\}', '', content)

# 9. Table headers and rows
content = re.sub(r'<th className="px-4 py-2\.5">Бренд / Модель</th>', '', content)
content = re.sub(r'<td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">\s*\{p\.brand \|\| \'-\'\} \{p\.model \? `\/ \$\{p\.model\}` : \'\'\}\s*<\/td>', '', content)

# 10. Search filter update
#   p.brand?.toLowerCase().includes(s) ||
#   p.model?.toLowerCase().includes(s)
content = re.sub(r'\s*p\.brand\?\.toLowerCase\(\)\.includes\(s\) \|\|', '', content)
content = re.sub(r'\s*p\.model\?\.toLowerCase\(\)\.includes\(s\)', '', content)
# We might leave trailing ||, so let's fix it if it happens:
content = re.sub(r'\|\|\s*\|\|', '||', content)
content = re.sub(r'p\.name\.toLowerCase\(\)\.includes\(s\)\s*\|\|\s*\n\s*p\.sku', r'p.name.toLowerCase().includes(s) ||\n                            p.sku', content)

with open('src/app/distributor/catalog/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
