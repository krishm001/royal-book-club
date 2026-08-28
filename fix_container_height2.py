with open('frontend/src/components/shared/ContinuousScanner.css', 'r') as f:
    css = f.read()

# Replace min-height with specific mode heights
css = css.replace(
'''.continuous-scanner-container.desktop-scale {
  min-height: 380px;
  max-width: 100%;
}

.continuous-scanner-container.mobile-scale {
  min-height: 280px;
  max-width: 100%;
}''',
'''.continuous-scanner-container.desktop-scale {
  max-width: 100%;
}
.continuous-scanner-container.desktop-scale.nfc-mode {
  height: 380px;
}
.continuous-scanner-container.desktop-scale.barcode-mode {
  height: 520px; /* Make room for 120px viewfinder */
}

.continuous-scanner-container.mobile-scale {
  max-width: 100%;
}
.continuous-scanner-container.mobile-scale.nfc-mode {
  height: 280px;
}
.continuous-scanner-container.mobile-scale.barcode-mode {
  height: 420px; /* Make room for 120px viewfinder */
}''')

with open('frontend/src/components/shared/ContinuousScanner.css', 'w') as f:
    f.write(css)

