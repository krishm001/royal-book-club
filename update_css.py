import re

with open('frontend/src/components/shared/ContinuousScanner.css', 'r') as f:
    content = f.read()

# Make instruction text 2X bigger and more highlighted
old_instr = '''/* Instruction Text */
.anim-instruction-text {
  position: absolute;
  top: 6px;
  left: 0;
  right: 0;
  z-index: 20;
  text-align: center;
  pointer-events: none;
}
.anim-instruction-text p {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--glass-bg);
  backdrop-filter: blur(6px);
  padding: 4px 12px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  margin: 0;
}'''

new_instr = '''/* Instruction Text */
.anim-instruction-text {
  position: absolute;
  top: 15px;
  left: 0;
  right: 0;
  z-index: 20;
  text-align: center;
  pointer-events: none;
}
.anim-instruction-text p {
  display: inline-block;
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  background: var(--accent);
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
  padding: 10px 24px;
  border-radius: 20px;
  border: 2px solid #fff;
  margin: 0;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
  letter-spacing: 0.5px;
}'''

content = content.replace(old_instr, new_instr)

# Slower human fade out
old_person_anim = '''@keyframes personCheckout {
  0%, 10% { opacity: 1; transform: translateX(0) scale(0.8); }
  25%, 100% { opacity: 0; transform: translateX(-40px) scale(0.8); }
}
@keyframes personReturn {
  0%, 55% { opacity: 0; transform: translateX(-40px) scale(0.8); }
  65%, 85% { opacity: 1; transform: translateX(0) scale(0.8); }
  95%, 100% { opacity: 0; transform: translateX(0) scale(0.8); }
}'''

new_person_anim = '''@keyframes personCheckout {
  0%, 15% { opacity: 1; transform: translateX(0) scale(0.8); }
  45%, 100% { opacity: 0; transform: translateX(-40px) scale(0.8); }
}
@keyframes personReturn {
  0%, 45% { opacity: 0; transform: translateX(-40px) scale(0.8); }
  65%, 85% { opacity: 1; transform: translateX(0) scale(0.8); }
  95%, 100% { opacity: 0; transform: translateX(0) scale(0.8); }
}'''
content = content.replace(old_person_anim, new_person_anim)


# Hand opacity classes
old_hand_anim = '''.anim-hand {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%) translateZ(14px) rotate(180deg);
  z-index: 10;
  opacity: 0;
}'''

new_hand_anim = '''.anim-hand-spine, .anim-hand-bottom {
  opacity: 0;
  z-index: 10;
}'''

content = content.replace(old_hand_anim, new_hand_anim)

with open('frontend/src/components/shared/ContinuousScanner.css', 'w') as f:
    f.write(content)
