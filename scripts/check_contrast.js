const fs = require('fs');
const path = require('path');

function findCssFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findCssFiles(filePath, fileList);
    } else if (filePath.endsWith('.css') || filePath.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = findCssFiles('/Users/deepikakumari/royalbookclub/frontend/src');

const badPatterns = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  if (file.endsWith('.css')) {
    const blocks = content.split('}');
    blocks.forEach(block => {
      if (!block.includes('{')) return;
      const [selectorPart, rulesPart] = block.split('{');
      if (!rulesPart) return;
      
      const selector = selectorPart.trim();
      const bgMatch = rulesPart.match(/background(?:-color)?\s*:\s*([^;!]+)/);
      const colorMatch = rulesPart.match(/(?<!-)color\s*:\s*([^;!]+)/);
      
      if (bgMatch && colorMatch) {
        const bg = bgMatch[1].trim();
        const fg = colorMatch[1].trim();
        
        // Dark backgrounds (rgba with low numbers, or #000, #111)
        const isDarkBg = bg.includes('rgba(0, 0, 0') || bg.includes('rgba(10') || bg.includes('#000') || bg.includes('#111');
        if (isDarkBg && fg.includes('var(--')) {
          badPatterns.push({ file: path.basename(file), selector, bg, fg, issue: 'Theme-aware text on hardcoded dark background' });
        }
      } else if (bgMatch) {
         // what if the text color is inherited?
         const bg = bgMatch[1].trim();
         const isDarkBg = bg.includes('rgba(0, 0, 0') || bg.includes('rgba(10') || bg.includes('#000') || bg.includes('#111');
         // If a block sets a dark background but doesn't set color, it might inherit dark text!
         if (isDarkBg && (bg.includes('0.5') || bg.includes('0.6') || bg.includes('0.7') || bg.includes('0.8') || bg.includes('0.9') || bg.includes('1)'))) {
             // Highly opaque dark background
             if (!rulesPart.includes('color: #fff') && !rulesPart.includes('color: rgba(255')) {
                badPatterns.push({ file: path.basename(file), selector, bg, issue: 'Dark background without explicit light text color' });
             }
         }
      }
    });
  }
});

console.log(JSON.stringify(badPatterns, null, 2));
