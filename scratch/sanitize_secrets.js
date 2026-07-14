// scratch/sanitize_secrets.js
const fs = require('fs');
const path = require('path');

const scratchDir = 'scratch';

// Matches OpenRouter API keys starting with sk-or-v1- followed by hex chars
const openRouterRegex = /sk-or-v1-[a-f0-9]{64}/gi;

// Matches JWT tokens or Supabase service role keys
const jwtRegex = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi;

function sanitizeFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    if (openRouterRegex.test(content)) {
      content = content.replace(openRouterRegex, 'sk-or-v1-REPLACED_FOR_SECURITY');
      modified = true;
    }
    
    if (jwtRegex.test(content)) {
      content = content.replace(jwtRegex, 'JWT_REPLACED_FOR_SECURITY');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Sanitized: ${filePath}`);
    }
  } catch (err) {
    console.error(`Failed to sanitize: ${filePath}`, err);
  }
}

function main() {
  if (!fs.existsSync(scratchDir)) {
    console.log("Scratch directory does not exist.");
    return;
  }

  const files = fs.readdirSync(scratchDir);
  files.forEach(file => {
    const fullPath = path.join(scratchDir, file);
    if (fs.statSync(fullPath).isFile()) {
      sanitizeFile(fullPath);
    }
  });

  console.log("Sanitization complete!");
}

main();
