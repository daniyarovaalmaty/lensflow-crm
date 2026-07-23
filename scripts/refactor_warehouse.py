import re

with open('src/app/distributor/warehouse/components/ProductBalances.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Rename filters
content = content.replace("const [brandFilter, setBrandFilter] = useState('all');", "const [nameFilter, setNameFilter] = useState('all');")
content = re.sub(r'const \[modelFilter, setModelFilter\] = useState\(\'all\'\);', '', content)

# 2. uniqueBrands / uniqueModels
content = content.replace("const uniqueBrands = Array.from(new Set(products.map(p => p.name).filter(Boolean))).sort();", "const uniqueNames = Array.from(new Set(products.map(p => p.name).filter(Boolean))).sort();")
content = re.sub(r'const uniqueModelsForBrand = [^;]+;', '', content)

# 3. Filtering logic in 'list' view
content = content.replace("const matchesBrand = brandFilter === 'all' || p.name === brandFilter;", "const matchesNameFilter = nameFilter === 'all' || p.name === nameFilter;")
content = re.sub(r'\s*const matchesModel = modelFilter === \'all\' \|\| p\.model === modelFilter;', '', content)
content = content.replace("matchesName && matchesBarcode && matchesStock && matchesBrand && matchesModel", "matchesName && matchesBarcode && matchesStock && matchesNameFilter")

# 4. Turnover export filtering
content = content.replace("const matchesBrand = brandFilter === 'all' || p.brand === brandFilter || p.name === brandFilter;", "const matchesNameFilter = nameFilter === 'all' || p.name === nameFilter;")
content = content.replace("matchesName && matchesBrand && matchesModel", "matchesName && matchesNameFilter")

# 5. Turnover export column generation
# From:
# const modelName = product.model || product.name || '';
# const brandName = product.brand || '';
# const fullName = brandName ? `${brandName} ${modelName}` : modelName;
# To:
# const fullName = product.name || '';
content = re.sub(
    r'const modelName = product\.model \|\| product\.name \|\| \'\';\s*const brandName = product\.brand \|\| \'\';\s*const fullName = brandName \? `\$\{brandName\} \$\{modelName\}` : modelName;',
    r'const fullName = product.name || \'\';',
    content
)

content = content.replace("'Модель': fullName,", "'Название товара': fullName,")
content = content.replace("'Модель': `Всего ${fullName}`,", "'Название товара': `Всего ${fullName}`,")

# 6. Dropdowns in UI
content = re.sub(
    r'<select\s*value=\{brandFilter\}[\s\S]*?<option value="all">Все бренды<\/option>\s*\{uniqueBrands\.map\(\(b: any\) => \(\s*<option key=\{b\} value=\{b\}>\{b\}<\/option>\s*\)\)\}\s*<\/select>',
    r'<select value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 pr-10"> <option value="all">Все товары</option> {uniqueNames.map((n: any) => (<option key={n} value={n}>{n}</option>))} </select>',
    content
)

content = re.sub(r'<select\s*value=\{modelFilter\}[\s\S]*?<\/select>', '', content)

# 7. List view table headers
content = content.replace('<th className="py-2 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6">Бренд</th>', '<th className="py-2 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6">Название товара</th>')
content = content.replace('<th className="px-2 py-2 text-left text-xs font-semibold text-gray-900">Модель</th>', '')

# 8. List view TD
content = content.replace('<span className="min-w-0 break-words">{product.brand || product.name}</span>', '<span className="min-w-0 break-words">{product.name}</span>')
content = re.sub(r'<td className="px-2 py-3 text-sm text-gray-500">\{product\.model \|\| \'-\'\}<\/td>', '', content)

# 9. Matrix table headers
content = content.replace('<th className="sticky top-0 border-b border-gray-300 bg-gray-50 bg-opacity-75 py-3 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6 backdrop-blur backdrop-filter">Бренд / Модель</th>', '<th className="sticky top-0 border-b border-gray-300 bg-gray-50 bg-opacity-75 py-3 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6 backdrop-blur backdrop-filter">Название товара</th>')

# Matrix filtering in render
content = content.replace("const matchesBrand = brandFilter === 'all' || p.brand === brandFilter || p.name === brandFilter;", "const matchesNameFilter = nameFilter === 'all' || p.name === nameFilter;")
content = content.replace("return matchesName && matchesBrand && matchesModel;", "return matchesName && matchesNameFilter;")

# Matrix TD
content = content.replace('<span className="font-bold text-gray-900">{product.brand || product.name}</span>', '<span className="font-bold text-gray-900">{product.name}</span>')
content = re.sub(r'\{product\.model && <span className="text-gray-500 font-normal">\{product\.model\}<\/span>\}', '', content)

with open('src/app/distributor/warehouse/components/ProductBalances.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
