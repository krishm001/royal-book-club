with open('frontend/src/components/shared/ScannerModal.css', 'r') as f:
    css = f.read()

# Make the overlay scrollable and prevent flex centering from clipping the top
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
    padding: 20px;
}''',
'''.universal-scanner-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-start; /* Prevent top clipping */
    justify-content: center;
    z-index: 1100;
    padding: 20px;
    overflow-y: auto; /* Let overlay scroll if modal is taller than screen */
}
.universal-scanner-modal {
    margin: auto; /* Re-center the modal when it is shorter than screen */
}''')

with open('frontend/src/components/shared/ScannerModal.css', 'w') as f:
    f.write(css)

