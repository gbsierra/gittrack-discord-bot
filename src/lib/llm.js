const OpenAI = require('openai');

/**
 * LLM Integration for generating user-friendly commit messages
 */
class LLMService {
  constructor() {
    this.openai = null;
  }

  /**
   * Initialize OpenAI client with API key
   * @param {string} apiKey - OpenAI API key
   */
  initializeOpenAI(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Generate user-friendly message from commit data
   * @param {Array} commits - Array of commit objects
   * @param {string} provider - 'openai' or 'openrouter'
   * @param {string} apiKey - API key for the provider
   * @param {Object} repository - Repository information
   * @returns {Promise<string>} User-friendly message
   */
  async generateUserFriendlyMessage(commits, provider, apiKey, repository) {
    try {
      console.log('🔍 [LLM] Generating user-friendly message:', {
        provider,
        hasApiKey: !!apiKey,
        commitCount: commits.length,
        repository: repository?.full_name
      });
      
      if (provider === 'openai') {
        return await this.generateWithOpenAI(commits, apiKey, repository);
      } else if (provider === 'openrouter') {
        return await this.generateWithOpenRouter(commits, apiKey, repository);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      console.error('❌ [LLM] Generation error:', error);
      return this.generateFallbackMessage(commits, repository);
    }
  }

  /**
   * Generate message using OpenAI
   * @param {Array} commits - Array of commit objects
   * @param {string} apiKey - OpenAI API key
   * @param {Object} repository - Repository information
   * @returns {Promise<string>} User-friendly message
   */
  async generateWithOpenAI(commits, apiKey, repository) {
    this.initializeOpenAI(apiKey);

    const commitMessages = commits.map(commit => commit.message).join('\n');
    const commitCount = commits.length;
    const repoName = repository.name;

    const prompt = `Analyze these GitHub commits and create a clear, concise update message for end users.

Repository: ${repoName}
Number of commits: ${commitCount}

Commit messages:
${commitMessages}

Requirements:
- Be direct and factual about what changed for users
- Explain what the change means for users (bug fix, new feature, improvement, etc.)
- Keep it concise (max 300 characters)
- Use simple, clear language that non-technical users understand
- Include relevant emoji (1-2 max)
- NO file names, technical details, or developer jargon
- NO fluff, opinions, or marketing language
- NO "try it out" or "let us know" phrases
- Focus on user-facing changes and impact

Examples of good messages:
- "🐛 Fixed login issue - users can now sign in without errors"
- "✨ Added dark mode toggle in settings"
- "⚡ Improved page loading speed by 40%"
- "🔧 Updated user dashboard layout"
- "📱 Fixed mobile app crashes"

Examples of BAD messages (avoid these):
- "Updated login.js and auth.ts files"
- "Refactored component structure"
- "Fixed database connection issues"
- "Updated dependencies and packages"

Generate a direct, user-focused update message.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a technical writer that converts commit messages into clear, factual update announcements. Be direct, concise, and focus on what actually changed and its impact on users.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  }

  /**
   * Generate message using OpenRouter (HTTP API)
   * @param {Array} commits - Array of commit objects
   * @param {string} apiKey - OpenRouter API key
   * @param {Object} repository - Repository information
   * @returns {Promise<string>} User-friendly message
   */
  async generateWithOpenRouter(commits, apiKey, repository) {
    console.log('🔍 [LLM] Starting OpenRouter generation:', {
      commitCount: commits.length,
      repoName: repository.name,
      hasApiKey: !!apiKey
    });
    
    const commitMessages = commits.map(commit => commit.message).join('\n');
    const commitCount = commits.length;
    const repoName = repository.name;

    console.log('🔍 [LLM] Commit messages to process:', {
      commitMessages: commitMessages.substring(0, 200) + (commitMessages.length > 200 ? '...' : ''),
      totalLength: commitMessages.length
    });

    const prompt = `Analyze these GitHub commits and create a clear, concise update message for end users.

Repository: ${repoName}
Number of commits: ${commitCount}

Commit messages:
${commitMessages}

Requirements:
- Be direct and factual about what changed for users
- Explain what the change means for users (bug fix, new feature, improvement, etc.)
- Keep it concise (max 300 characters)
- Use simple, clear language that non-technical users understand
- Include relevant emoji (1-2 max)
- NO file names, technical details, or developer jargon
- NO fluff, opinions, or marketing language
- NO "try it out" or "let us know" phrases
- Focus on user-facing changes and impact

Examples of good messages:
- "🐛 Fixed login issue - users can now sign in without errors"
- "✨ Added dark mode toggle in settings"
- "⚡ Improved page loading speed by 40%"
- "🔧 Updated user dashboard layout"
- "📱 Fixed mobile app crashes"

Examples of BAD messages (avoid these):
- "Updated login.js and auth.ts files"
- "Refactored component structure"
- "Fixed database connection issues"
- "Updated dependencies and packages"

Generate a direct, user-focused update message.`;

    console.log('🔍 [LLM] Making OpenRouter API request...');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://gittrack-enhanced.com',
        'X-Title': 'GitTrack Enhanced'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are a technical writer that converts commit messages into clear, factual update announcements. Be direct, concise, and focus on what actually changed and its impact on users.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      })
    });

    console.log('🔍 [LLM] OpenRouter API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [LLM] OpenRouter API error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [LLM] OpenRouter API success, response length:', data.choices[0].message.content.length);
    
    return data.choices[0].message.content.trim();
  }

  /**
   * Generate fallback message when LLM fails
   * @param {Array} commits - Array of commit objects
   * @param {Object} repository - Repository information
   * @returns {string} Fallback message
   */
  generateFallbackMessage(commits, repository) {
    const commitCount = commits.length;
    
    if (commitCount === 1) {
      // Use just the commit title (first line)
      return commits[0].message.split('\n')[0];
    } else {
      // Use the first commit title and indicate there are more
      const firstCommitTitle = commits[0].message.split('\n')[0];
      return `${firstCommitTitle} (+${commitCount - 1} more)`;
    }
  }

  /**
   * Create Discord embed from LLM message
   * @param {string} message - LLM generated message
   * @param {Object} repository - Repository information
   * @param {string} compareUrl - GitHub compare URL
   * @param {boolean} hideGitHubLinks - Whether to hide GitHub links
   * @returns {Object} Discord embed object
   */
  createDiscordEmbed(message, repository, compareUrl, hideGitHubLinks = false) {
    const embed = {
      color: 0x28a745, // GitHub green
      description: message,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'GitTrack Enhanced • AI-Powered Updates',
        icon_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
      }
    };

    // Only add GitHub links if not hidden
    if (!hideGitHubLinks) {
      embed.fields = [
        {
          name: 'Repository',
          value: `[${repository.full_name}](${repository.html_url})`,
          inline: true
        },
        {
          name: 'View Changes',
          value: `[Compare](${compareUrl})`,
          inline: true
        }
      ];
    }

    return embed;
  }
}

module.exports = new LLMService();
