with open('frontend/src/components/shared/ContinuousScanner.css', 'r') as f:
    css = f.read()

# Make the container grow to fit its contents
css = css.replace(
'''.continuous-scanner-container.desktop-scale {
  height: 380px;
  max-width: 100%;
}

.continuous-scanner-container.mobile-scale {
  height: 280px;
  max-width: 100%;
}''',
'''.continuous-scanner-container.desktop-scale {
  min-height: 380px;
  max-width: 100%;
}

.continuous-scanner-container.mobile-scale {
  min-height: 280px;
  max-width: 100%;
}''')

with open('frontend/src/components/shared/ContinuousScanner.css', 'w') as f:
    f.write(css)

