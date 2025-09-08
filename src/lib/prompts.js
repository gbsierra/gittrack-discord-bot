/**
 * Prompt templates for LLM integration
 */
class PromptService {
  /**
   * Generate prompt for push event analysis
   * @param {Array} commits - Array of commit objects
   * @param {Object} repository - Repository information
   * @param {string} diff - Git diff of the commit
   * @returns {string} Formatted prompt
   */
  generatePushPrompt(commits, repository, diff) {
    const commitMessages = commits.map(commit => commit.message).join('\n');
    const commitCount = commits.length;
    const repoName = repository.name;

    // Filter diff to show only changes + context
    const filteredDiff = this.filterDiffToChanges(diff);

    return `Analyze this git diff and create a structured update summary for end users.

Repository: ${repoName}

Git Diff:
${filteredDiff}

Requirements for bullet points:
- Identify specific fixes/features for specific platforms or areas
- Explain improvements in user terms (what users will notice)
- Use simple, clear language that non-technical users understand
- Focus on user-facing changes and impact
- Avoid technical details while conveying the impact
- Each bullet point should be concise but meaningful
- NO file names, technical details, or developer jargon
- NO fluff, opinions, or marketing language
- NO emojis or visual elements

Examples of good bullet points:
- "Fixed lesson buttons on mobile devices and improved error handling when content is unavailable"
- "Fixed login issue - users can now sign in without errors"
- "Added dark mode toggle in settings"
- "Improved page loading speed by 40%"
- "Updated user dashboard layout for better navigation"
- "Enhanced security for user data protection"
- "Added progress tracking for completed lessons"

Examples of BAD bullet points (avoid these):
- "Updated login.js and auth.ts files"
- "Refactored component structure"
- "Fixed database connection issues"
- "Updated dependencies and packages"
- "Improved code quality"
- "Fixed bugs"

Output format (JSON only):
{
  "summary": "Brief overall summary without emojis",
  "changes": [
    "First specific user-facing change",
    "Second specific user-facing change",
    "Third specific user-facing change"
  ]
}

Generate a JSON response with a summary and 2-4 meaningful bullet points.`;
  }

  /**
   * Filter git diff to show only changed lines + context
   * @param {string} diff - Raw git diff
   * @returns {string} Filtered diff with only changes and context
   */
  filterDiffToChanges(diff) {
    if (!diff) return 'No diff available';
    
    const lines = diff.split('\n');
    const filteredLines = [];
    const addedLines = new Set(); // Track lines we've already added to avoid duplicates
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Keep diff headers (file names, line numbers, etc.)
      if (line.startsWith('diff --git') || 
          line.startsWith('index ') || 
          line.startsWith('--- ') || 
          line.startsWith('+++ ') || 
          line.startsWith('@@ ')) {
        filteredLines.push(line);
        continue;
      }
      
      // Check if this is a changed line
      if (line.startsWith('+') || line.startsWith('-')) {
        // Add context line before (if exists and not already added)
        if (i > 0 && !addedLines.has(i-1)) {
          const prevLine = lines[i-1];
          if (!prevLine.startsWith('+') && !prevLine.startsWith('-') && !prevLine.startsWith('@@')) {
            filteredLines.push(prevLine);
            addedLines.add(i-1);
          }
        }
        
        // Add the changed line
        filteredLines.push(line);
        addedLines.add(i);
        
        // Add context line after (if exists and not already added)
        if (i < lines.length - 1 && !addedLines.has(i+1)) {
          const nextLine = lines[i+1];
          if (!nextLine.startsWith('+') && !nextLine.startsWith('-') && !nextLine.startsWith('@@')) {
            filteredLines.push(nextLine);
            addedLines.add(i+1);
          }
        }
      }
    }
    
    return filteredLines.join('\n');
  }
}

module.exports = new PromptService();
