import re

with open('frontend/src/pages/catalog/CatalogPage.jsx', 'r') as f:
    content = f.read()

# Fix handleCloseCardModal to not clear selectedBook if we are just switching to manual
content = content.replace(
'''  const handleCloseCardModal = async () => {
    await stopCardBarcodeScanner();
    setNfcModalOpen(false);
    setSelectedBook(null);
  };''',
'''  const handleCloseCardModal = async (keepBook = false) => {
    await stopCardBarcodeScanner();
    setNfcModalOpen(false);
    if (!keepBook) {
      setSelectedBook(null);
    }
  };''')

# Fix the manual tab onClick
content = content.replace(
'''              if (tab === 'manual') { handleCloseCardModal(); setFallbackModalOpen(true); }''',
'''              if (tab === 'manual') { handleCloseCardModal(true); setFallbackModalOpen(true); }''')

with open('frontend/src/pages/catalog/CatalogPage.jsx', 'w') as f:
    f.write(content)

