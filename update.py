import re

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'r') as f:
    content = f.read()

# 1. Move !mounted logic so text renders instantly
content = content.replace('''  if (!mounted) {
    return <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="pulse-ring"></div>
    </div>;
  }''', '')

# 2. Add mounted wrapper around scene-3d and keep text overlay outside
wrapper = '''      {/* Instruction Text Overlay - Renders instantly */}
      <div className="anim-instruction-text">
        <p>{getInstructionText()}</p>
      </div>

      {!mounted ? (
        <div style={{ height: '260px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pulse-ring" style={{ borderColor: t.accent, width: '40px', height: '40px', borderWidth: '3px' }}></div>
        </div>
      ) : (
      <>
      <div className="scene-3d">'''

content = content.replace('''      {/* Instruction Text Overlay */}
      <div className="anim-instruction-text">
        <p>{getInstructionText()}</p>
      </div>

      <div className="scene-3d">''', wrapper)

# close the wrapper
content = content.replace('''      </div>
    </div>
  );
};''', '''      </div>
      </>
      )}
    </div>
  );
};''')

# 3. Replace hand SVG with spine+bottom hand parts
old_hand = '''            {/* Realistic Hand (palm with fingers) */}
            <div className={`anim-hand ${animClass}-hand`}>
              <svg width="55" height="70" viewBox="0 0 55 70">
                {/* Palm */}
                <path d="M 5 35 C 5 20, 20 10, 40 12 C 50 14, 55 25, 55 35 C 55 45, 50 55, 40 58 C 30 60, 15 55, 5 45 Z" fill="#dcb38f" stroke="#c0936f" strokeWidth="0.5" />
                {/* Fingers */}
                <path d="M 40 12 C 42 4, 46 0, 48 0 C 50 0, 52 4, 50 12" fill="#dcb38f" stroke="#c0936f" strokeWidth="0.5" />
                <path d="M 48 14 C 52 5, 55 2, 55 2" stroke="#dcb38f" strokeWidth="6" strokeLinecap="round" fill="none" />
                <path d="M 30 11 C 30 3, 34 0, 36 0 C 38 0, 40 3, 38 11" fill="#dcb38f" stroke="#c0936f" strokeWidth="0.5" />
                <path d="M 20 14 C 18 6, 22 2, 25 2 C 28 2, 30 6, 28 14" fill="#dcb38f" stroke="#c0936f" strokeWidth="0.5" />
                {/* Thumb */}
                <path d="M 5 35 C -2 30, -4 22, 2 18 C 8 14, 12 18, 10 25" fill="#dcb38f" stroke="#c0936f" strokeWidth="0.5" />
                {/* Palm lines */}
                <path d="M 15 28 Q 30 22, 45 28" stroke="#c0936f" strokeWidth="0.5" fill="none" opacity="0.5" />
                <path d="M 12 38 Q 28 33, 42 38" stroke="#c0936f" strokeWidth="0.5" fill="none" opacity="0.5" />
              </svg>
            </div>'''

new_hand = '''            {/* Hand holding spine and bottom */}
            <div className={`anim-hand ${animClass}-hand`}>
               {/* We place these inside .anim-book so they flip with the book natively! */}
            </div>'''
# Actually, the user wants the thumb on the spine, and index finger on the lower edge.
# We can position them as absolute elements over `.book-spine` and `.book-bottom`.
# So let's put them inside the respective faces!

# Wait, if I put them in .book-spine and .book-bottom, they will render on those faces natively.
# Let's remove the .anim-hand wrapper completely here, and I'll add the SVGs into the faces themselves.

content = content.replace(old_hand, '''            {/* The hand elements are embedded into the book faces below */}
''')

# Insert thumb into spine
spine_face = '''            <div className="book-face book-spine">
              <div className="spine-text">{book?.title || 'Book Title'}</div>
            </div>'''
spine_with_thumb = '''            <div className="book-face book-spine">
              <div className="spine-text">{book?.title || 'Book Title'}</div>
              <div className={`anim-hand-spine ${animClass}-hand`} style={{position: 'absolute', bottom: 10, left: -2, width: 24, height: 40}}>
                 <svg width="28" height="40" viewBox="0 0 28 40" style={{ transform: 'rotate(90deg)' }}>
                   <path d="M 0 40 C 0 20, 10 10, 20 10 C 25 10, 28 15, 28 20 C 28 30, 20 40, 15 40 Z" fill="#dcb38f" stroke="#c0936f" strokeWidth="1"/>
                   <path d="M 10 25 Q 15 22, 20 25" stroke="#c0936f" strokeWidth="1" fill="none" opacity="0.6"/>
                 </svg>
              </div>
            </div>'''
content = content.replace(spine_face, spine_with_thumb)

# Insert fingers into bottom
bottom_face = '''            <div className="book-face book-bottom"></div>'''
bottom_with_fingers = '''            <div className="book-face book-bottom">
              <div className={`anim-hand-bottom ${animClass}-hand`} style={{position: 'absolute', top: 0, left: 10, width: 80, height: 24}}>
                 <svg width="80" height="24" viewBox="0 0 80 24" style={{ transform: 'rotateX(180deg)' }}>
                   {/* Fingers supporting bottom */}
                   <path d="M 0 24 C 0 5, 10 0, 15 0 C 20 0, 25 5, 25 24" fill="#dcb38f" stroke="#c0936f" strokeWidth="1"/>
                   <path d="M 20 24 C 20 5, 30 -2, 35 -2 C 40 -2, 45 5, 45 24" fill="#dcb38f" stroke="#c0936f" strokeWidth="1"/>
                   <path d="M 40 24 C 40 5, 50 0, 55 0 C 60 0, 65 5, 65 24" fill="#dcb38f" stroke="#c0936f" strokeWidth="1"/>
                   <path d="M 60 24 C 60 10, 70 5, 75 5 C 80 5, 80 10, 80 24" fill="#dcb38f" stroke="#c0936f" strokeWidth="1"/>
                 </svg>
              </div>
            </div>'''
content = content.replace(bottom_face, bottom_with_fingers)

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'w') as f:
    f.write(content)
