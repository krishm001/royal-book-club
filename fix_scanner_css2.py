with open('frontend/src/components/shared/ScannerModal.css', 'r') as f:
    css = f.read()

# Make the overlay have padding instead of the modal having margin
css = css.replace(
'''.universal-scanner-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
}''',
'''.universal-scanner-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: 20px;
}''')

# Remove display: flex from modal so it acts as a normal block container for scrolling
css = css.replace(
'''.universal-scanner-modal {
    width: 100%;
    max-width: 480px;
    background: var(--surface);
    border: 1px solid var(--accent);
    box-shadow: 0 10px 40px var(--card-shadow);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    overflow-y: auto;
    overscroll-behavior: contain;
}''',
'''.universal-scanner-modal {
    width: 100%;
    max-width: 480px;
    background: var(--surface);
    border: 1px solid var(--accent);
    box-shadow: 0 10px 40px var(--card-shadow);
    border-radius: 12px;
    display: block; /* Removed flex to fix scroll bugs */
    max-height: 90vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    position: relative;
}''')

# Remove margin from mobile tweaks since we have padding on overlay
css = css.replace(
'''        max-height: 92vh;
        margin: 8px;''',
'''        max-height: 95vh;
        margin: 0;''')

with open('frontend/src/components/shared/ScannerModal.css', 'w') as f:
    f.write(css)
