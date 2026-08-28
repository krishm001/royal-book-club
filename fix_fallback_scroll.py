import os

files = ['frontend/src/pages/catalog/CatalogPage.jsx', 'frontend/src/pages/catalog/BookDetailPage.jsx']

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    # Fix overlay styles
    content = content.replace("alignItems: 'center',", "alignItems: 'flex-start',\n        overflowY: 'auto',")
    
    # Ensure margin: auto on the card
    content = content.replace("width: '100%',\n          maxWidth: '440px',", "width: '100%',\n          maxWidth: '440px',\n          margin: 'auto',")
    
    with open(file, 'w') as f:
        f.write(content)
