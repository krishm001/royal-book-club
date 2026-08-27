import re

with open('frontend/src/components/shared/ScannerModal.jsx', 'r') as f:
    content = f.read()

import_react = "import React, { useEffect } from 'react';"
content = content.replace("import React from 'react';", import_react)

effect_code = '''
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
'''
content = content.replace("    if (!isOpen) return null;", effect_code + "\n    if (!isOpen) return null;")

with open('frontend/src/components/shared/ScannerModal.jsx', 'w') as f:
    f.write(content)
