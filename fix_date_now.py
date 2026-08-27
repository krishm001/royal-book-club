import re

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'r') as f:
    content = f.read()

content = content.replace("import React, { useState, useEffect, useMemo } from 'react';", "import React, { useState, useEffect, useMemo, useRef } from 'react';")

old_code = '''  // Phase text instructions synced to CSS animation (15s loop)
  useEffect(() => {
    if (!mounted) return;
    const getPhase = () => {
      const elapsed = (Date.now() / 1000) % 20;'''

new_code = '''  const startTimeRef = useRef(Date.now());
  // Phase text instructions synced to CSS animation (20s loop)
  useEffect(() => {
    startTimeRef.current = Date.now();
    const getPhase = () => {
      const elapsed = ((Date.now() - startTimeRef.current) / 1000) % 20;'''

content = content.replace(old_code, new_code)

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'w') as f:
    f.write(content)
