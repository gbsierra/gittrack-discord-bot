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

CRITICAL REQUIREMENTS:
1. Each bullet point MUST be directly derived from specific changes visible in the diff above
2. You must be able to point to exact lines of code that support each bullet point
3. If you cannot find evidence in the diff for a change, DO NOT include it
4. ONLY include changes that directly affect the user experience - what users will see, feel, or interact with differently

Analysis Process:
1. First, identify all user-facing changes by examining the diff
2. For each change, determine what users will actually experience differently
3. Only create bullet points for changes that have a direct impact on user experience
4. If the diff shows only internal/technical changes with no user impact, create no bullet points

Requirements for bullet points:
- Each bullet point must correspond to specific additions/deletions in the diff
- Explain what users will notice or experience differently
- Use simple, clear language that non-technical users understand
- Be specific about the user impact (what they can see, do, or experience)
- NO file names, technical details, or developer jargon
- NO fluff, opinions, or marketing language
- NO emojis or visual elements
- NO generic statements that could apply to any commit

Examples of EVIDENCE-BASED bullet points:
- "Fixed login form validation - users will no longer see 'invalid email' errors for valid addresses" (evidence: validation logic changes in diff)
- "Added dark mode toggle in user settings menu" (evidence: new UI component in diff)
- "Improved mobile navigation - menu now slides in from the left" (evidence: CSS/JS changes for mobile menu)
- "Fixed image loading issue on slow connections" (evidence: timeout/retry logic changes)

Examples of BAD bullet points (avoid these):
- "Improved user experience" (too vague, no specific evidence)
- "Fixed bugs" (generic, no specific evidence)
- "Updated dependencies" (technical, not user-facing)
- "Enhanced security" (vague, unless specific security code is visible)
- "Improved performance" (unless specific performance code is visible)

Output format (JSON only):
{
  "summary": "Brief overall summary without emojis",
  "changes": [
    "First specific user-facing change with clear evidence in diff",
    "Second specific user-facing change with clear evidence in diff"
  ]
}

Generate a JSON response with a summary and evidence-based bullet points. Include as many or as few bullet points as needed - only include changes that directly affect the user experience. If there are no user-facing changes, the changes array can be empty.`;
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
