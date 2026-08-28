with open('frontend/src/components/shared/ContinuousScanner.css', 'r') as f:
    css = f.read()

# Make the container a flex column
css = css.replace(
'''.continuous-scanner-container {
  width: 100%;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 8px;
  background: var(--surface-elevated);
  border: 1px solid rgba(212, 175, 55, 0.2);
  position: relative;
}''',
'''.continuous-scanner-container {
  width: 100%;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 8px;
  background: var(--surface-elevated);
  border: 1px solid rgba(212, 175, 55, 0.2);
  position: relative;
  display: flex;
  flex-direction: column;
}''')

# Make scene-3d take up remaining space exactly
css = css.replace(
'''.scene-3d {
  width: 100%;
  height: 100%;
  position: relative;
  perspective: 1200px;
  transform-style: preserve-3d;
}''',
'''.scene-3d {
  width: 100%;
  flex: 1;
  position: relative;
  perspective: 1200px;
  transform-style: preserve-3d;
}''')

with open('frontend/src/components/shared/ContinuousScanner.css', 'w') as f:
    f.write(css)

