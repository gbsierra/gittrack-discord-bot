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

    const prompt = `Analyze these GitHub commits and create a user-friendly announcement for Discord users.

Repository: ${repoName}
Number of commits: ${commitCount}

Commit messages:
${commitMessages}

Requirements:
- Focus on user benefits, not technical details
- Use friendly, non-technical language
- Explain what users will experience differently
- Keep it concise and clear (max 500 characters)
- Hide any sensitive information (usernames, file paths, etc.)
- Use emojis to make it engaging
- Format as a Discord message

Generate a Discord message that regular users will understand and appreciate.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that converts technical commit messages into user-friendly Discord announcements. Focus on user benefits and use engaging, non-technical language.'
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

    const prompt = `Analyze these GitHub commits and create a user-friendly announcement for Discord users.

Repository: ${repoName}
Number of commits: ${commitCount}

Commit messages:
${commitMessages}

Requirements:
- Focus on user benefits, not technical details
- Use friendly, non-technical language
- Explain what users will experience differently
- Keep it concise and clear (max 500 characters)
- Hide any sensitive information (usernames, file paths, etc.)
- Use emojis to make it engaging
- Format as a Discord message

Generate a Discord message that regular users will understand and appreciate.`;

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
            content: 'You are a helpful assistant that converts technical commit messages into user-friendly Discord announcements. Focus on user benefits and use engaging, non-technical language.'
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
    const repoName = repository.name;
    
    if (commitCount === 1) {
      return `🚀 **${repoName} Update**\n\nWe've made an improvement to enhance your experience! The latest changes will make things better for you. 🎉`;
    } else {
      return `🚀 **${repoName} Update**\n\nWe've made ${commitCount} improvements to enhance your experience! These changes will make things better for you. 🎉`;
    }
  }

  /**
   * Create Discord embed from LLM message
   * @param {string} message - LLM generated message
   * @param {Object} repository - Repository information
   * @param {string} compareUrl - GitHub compare URL
   * @returns {Object} Discord embed object
   */
  createDiscordEmbed(message, repository, compareUrl) {
    return {
      color: 0x28a745, // GitHub green
      title: '🤖 AI-Enhanced Update',
      description: message,
      fields: [
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
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'GitTrack Enhanced • AI-Powered Updates',
        icon_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
      }
    };
  }
}

module.exports = new LLMService();
