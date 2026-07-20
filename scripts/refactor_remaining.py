import re
import os

def update_new_supply_form():
    path = 'src/app/distributor/warehouse/components/SupplyModule/NewSupplyForm.tsx'
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    # Remove brand from search list
    # {p.brand && <p className="text-[10px] md:text-xs text-gray-400 font-semibold">{p.brand}</p>}
    content = re.sub(r'\{p\.brand && <p className="text-\[10px\] md:text-xs text-gray-400 font-semibold">\{p\.brand\}<\/p>\}', '', content)
    # {item.product.brand && <div className="text-xs text-gray-400 font-medium">{item.product.brand}</div>}
    content = re.sub(r'\{item\.product\.brand && <div className="text-xs text-gray-400 font-medium">\{item\.product\.brand\}<\/div>\}', '', content)
    # p.brand?.toLowerCase().includes(s)
    content = re.sub(r'\s*p\.brand\?\.toLowerCase\(\)\.includes\(low\)\s*\|\|', '', content)
    # [p.brand, p.sku ...]
    content = re.sub(r'p\.brand, ', '', content)
    
    with open(path, 'w', encoding='utf-8') as f: f.write(content)

def update_product_batch_selector():
    path = 'src/app/distributor/warehouse/components/SupplyModule/ProductBatchSelectorModal.tsx'
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    # {p.brand && <p ...>}
    content = re.sub(r'\{p\.brand && <p className="[^"]+">\{p\.brand\}<\/p>\}', '', content)
    # p.brand?.toLowerCase().includes(s)
    content = re.sub(r'\s*p\.brand\?\.toLowerCase\(\)\.includes\(s\)\s*\|\|', '', content)
    
    with open(path, 'w', encoding='utf-8') as f: f.write(content)

def update_document_viewer():
    path = 'src/app/distributor/warehouse/components/DocumentViewerModal.tsx'
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    # <span className="text-xs font-semibold text-gray-800">{item.product.brand || item.product.name}</span>
    content = content.replace('<span className="text-xs font-semibold text-gray-800">{item.product.brand || item.product.name}</span>', '<span className="text-xs font-semibold text-gray-800">{item.product.name}</span>')
    # <span className="text-[10px] text-gray-500">{item.product.model}</span>
    content = re.sub(r'\{item\.product\.model && <span className="text-\[10px\] text-gray-500">\{item\.product\.model\}<\/span>\}', '', content)
    
    with open(path, 'w', encoding='utf-8') as f: f.write(content)

update_new_supply_form()
update_product_batch_selector()
update_document_viewer()

print("Remaining files updated")
