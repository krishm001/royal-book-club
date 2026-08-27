import re

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'r') as f:
    content = f.read()

bad_jsx = '''      {!mounted ? (
        <div style={{ height: '260px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pulse-ring" style={{ borderColor: tPalette.accent, width: '40px', height: '40px', borderWidth: '3px' }}></div>
        </div>
      ) : (
      {renderViewfinder && renderViewfinder}
      <>
      <div className="scene-3d">'''

good_jsx = '''      {renderViewfinder && renderViewfinder}

      <div className="scene-3d">'''

content = content.replace(bad_jsx, good_jsx)

# We also need to remove the closing `</>` and `)}` from the end of the return statement
content = content.replace("      </>\n      )}", "")

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'w') as f:
    f.write(content)
