import os

files = ['frontend/src/pages/catalog/CatalogPage.jsx', 'frontend/src/pages/catalog/BookDetailPage.jsx']

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    # Replace height in qrbox
    content = content.replace('const idealH = Math.min(height * 0.8, 250);', 'const idealH = 120;')
    # Replace height in size-based qrbox
    content = content.replace('const size = Math.min(width * 0.8, height * 0.8, 200);\n              return {\n                width: size,\n                height: size\n              };', 'const size = Math.min(width * 0.8, 350);\n              return {\n                width: size,\n                height: 120\n              };')
    
    with open(file, 'w') as f:
        f.write(content)
