const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      searchDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Look for $ but ignore ${ and ignore console.log
        if (line.includes('$') && !line.includes('${') && !line.includes('console.log')) {
          console.log(`Match in ${fullPath}:${i + 1}`);
          console.log(line.trim());
        }
      }
    }
  }
}

searchDir('C:\\crm files\\crm2\\crm2\\src');
