import re

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'r') as f:
    content = f.read()

bad_jsx = '''      {/* Instruction Text Overlay - Renders instantly */}
      <div className="anim-instruction-text" style={{ position: "relative", top: "10px", marginBottom: "15px", zIndex: 100 }}>
        <p>{getInstructionText()}</p>
      </div>

      {renderViewfinder && renderViewfinder}'''

good_jsx = '''      {renderViewfinder && renderViewfinder}

      {/* Instruction Text Overlay */}
      <div className="anim-instruction-text" style={{ position: "relative", margin: "8px 0", zIndex: 100, textAlign: "center" }}>
        <p style={{ margin: 0, fontWeight: "600", fontSize: "1.2rem", color: "var(--text-primary)" }}>{getInstructionText()}</p>
      </div>'''

content = content.replace(bad_jsx, good_jsx)

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'w') as f:
    f.write(content)
