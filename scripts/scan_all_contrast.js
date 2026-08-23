const fs = require('fs');
const path = require('path');

function findFiles(dir, exts, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, exts, fileList);
    } else if (exts.some(ext => filePath.endsWith(ext))) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = findFiles('/Users/deepikakumari/royalbookclub/frontend/src', ['.jsx', '.css']);
const report = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const fileName = path.basename(file);
  const relativePath = path.relative('/Users/deepikakumari/royalbookclub/frontend/src', file);

  if (file.endsWith('.jsx')) {
    // Scan inline styles for bad combinations
    // Look for style={{ ... }}
    const styleRegex = /style=\{\{([^}]+)\}\}/g;
    let match;
    while ((match = styleRegex.exec(content)) !== null) {
      const styleContent = match[1];
      const bgMatch = styleContent.match(/background:\s*['"]([^'"]+)['"]/);
      const colorMatch = styleContent.match(/color:\s*['"]([^'"]+)['"]/);
      
      if (bgMatch && colorMatch) {
        const bg = bgMatch[1];
        const fg = colorMatch[1];
        
        if (bg.includes('var(--accent)') && (fg.includes('var(--text-primary)') || fg.includes('#1a1510') || fg.includes('#000'))) {
          report.push({ file: relativePath, type: 'Inline JSX', bg, fg, issue: 'Dark text on Crimson (Accent) background' });
        }
      }
    }
    
    // Also check for className="... btn-preserve ..." or similar if we can't find inline styles.
    // The user mentioned "preserve in ledger" button in Profile page.
  } 
  
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
        
        if (bg.includes('var(--accent)') && (fg.includes('var(--text-primary)') || fg.includes('var(--text-secondary)') || fg.includes('#1a1510') || fg.includes('#000'))) {
          report.push({ file: relativePath, type: 'CSS Rule', selector, bg, fg, issue: 'Dark text on Crimson (Accent) background' });
        }
        
        const isDarkBg = bg.includes('rgba(0, 0, 0') || bg.includes('rgba(10') || bg.includes('#000') || bg.includes('#111');
        if (isDarkBg && (fg.includes('var(--text-primary)') || fg.includes('var(--text-secondary)') || fg.includes('var(--accent)'))) {
          report.push({ file: relativePath, type: 'CSS Rule', selector, bg, fg, issue: 'Theme-aware dark text on hardcoded dark background' });
        }
      }
    });
  }
});

fs.writeFileSync('/Users/deepikakumari/royalbookclub/scripts/contrast_report.json', JSON.stringify(report, null, 2));
console.log(`Found ${report.length} issues.`);
