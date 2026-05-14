import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    new_content = re.sub(
        r'(\w+)\.config\.eyes\.od', 
        r'(\1.config?.eyes?.od || { km: "-", dia: "-", dk: "-", qty: 0 })', 
        content
    )
    new_content = re.sub(
        r'(\w+)\.config\.eyes\.os', 
        r'(\1.config?.eyes?.os || { km: "-", dia: "-", dk: "-", qty: 0 })', 
        new_content
    )
    
    new_content = re.sub(
        r'\((\w+)\.config\.eyes\s*as\s*any\)\[side\]',
        r'((\1.config?.eyes || {}) as any)[side]',
        new_content
    )

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            fix_file(os.path.join(root, file))
