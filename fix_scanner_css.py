import re

with open('frontend/src/components/shared/ScannerModal.css', 'r') as f:
    content = f.read()

bad_mobile = '''    .universal-scanner-modal {
        max-width: 100%;
        height: 100%;
        max-height: 100vh;
        border-radius: 0;
        border: none;
        box-shadow: none;
        justify-content: flex-start;
    }'''

good_mobile = '''    .universal-scanner-modal {
        max-width: 100%;
        max-height: 90vh;
        border-radius: 12px;
        justify-content: flex-start;
        margin: 16px;
    }'''

content = content.replace(bad_mobile, good_mobile)

# Let's also normalize viewfinder height to 160px everywhere
content = content.replace("height: 110px !important;", "height: 160px !important;")
content = content.replace("height: 110px; /* Squat 0.5x height as requested */", "height: 160px;")

with open('frontend/src/components/shared/ScannerModal.css', 'w') as f:
    f.write(content)
