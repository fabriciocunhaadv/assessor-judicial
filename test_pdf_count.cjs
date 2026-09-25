const fs = require('fs');

function countPdfPages(buffer) {
  try {
    const str = buffer.toString("binary");
    const countMatch = str.match(/\/Count\s+(\d+)/);
    if (countMatch && parseInt(countMatch[1], 10) > 0) {
      return parseInt(countMatch[1], 10);
    }
    const pageMatches = str.match(/\/Type\s*\/Page\b/g);
    return pageMatches ? pageMatches.length : 1;
  } catch {
    return 1;
  }
}

// Suppose a PDF has /Type /Pages /Count 45 but also has /Count 10 in a font dict.
const fakePdf = Buffer.from("/Count 10 \n /Type /Pages /Count 45");
console.log("Count:", countPdfPages(fakePdf));

// Let's improve countPdfPages to prioritize /Type /Pages /Count
function improvedCountPdfPages(buffer) {
  try {
    const str = buffer.toString("binary");
    // Look for /Type /Pages /Count <num> or /Count <num> inside a dictionary that has /Type /Pages
    // A more robust regex:
    const pagesMatch = str.match(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/);
    if (pagesMatch && parseInt(pagesMatch[1], 10) > 0) {
        return parseInt(pagesMatch[1], 10);
    }
    const countMatch = str.match(/\/Count\s+(\d+)/);
    if (countMatch && parseInt(countMatch[1], 10) > 0) {
      return parseInt(countMatch[1], 10);
    }
    const pageMatches = str.match(/\/Type\s*\/Page\b/g);
    return pageMatches ? pageMatches.length : 1;
  } catch {
    return 1;
  }
}
console.log("Improved count:", improvedCountPdfPages(fakePdf));
