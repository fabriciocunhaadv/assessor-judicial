import re

with open('server.ts', 'r') as f:
    text = f.read()

target = r'''function countPdfPages(buffer) { try { const str = buffer.toString("binary"); const countMatch = str.match(/\/Count\s+(\d+)/); if (countMatch && parseInt(countMatch[1], 10) > 0) { return parseInt(countMatch[1], 10); } const pageMatches = str.match(/\/Type\s*\/Page\b/g); return pageMatches ? pageMatches.length : 1; } catch { return 1; } }'''

replacement = '''function countPdfPages(buffer) {
  try {
    const str = buffer.toString("binary");
    
    // First attempt: Find the root /Pages dictionary which should contain the actual page count
    // Sometimes they are separated by other dict entries, so we use a bit more flexible regex,
    // or we can just count the exact number of /Type /Page occurrences which is foolproof.
    const pageMatches = str.match(/\\/Type\\s*\\/Page\\b/g);
    if (pageMatches && pageMatches.length > 0) {
      return pageMatches.length;
    }

    // Fallback if not found: try looking for /Count <num> inside /Pages
    const pagesMatch = str.match(/\\/Type\\s*\\/Pages[^>]*?\\/Count\\s+(\\d+)/);
    if (pagesMatch && parseInt(pagesMatch[1], 10) > 0) {
        return parseInt(pagesMatch[1], 10);
    }
    
    const countMatch = str.match(/\\/Count\\s+(\\d+)/);
    if (countMatch && parseInt(countMatch[1], 10) > 0) {
      return parseInt(countMatch[1], 10);
    }
    
    return 1;
  } catch {
    return 1;
  }
}'''
# let's be careful with backslashes in replacement string.
