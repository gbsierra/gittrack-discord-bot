const OpenAI = require('openai');
const promptService = require('./prompts');

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
   * @param {string} diff - Git diff of the commit
   * @returns {Promise<string>} User-friendly message
   */
  async generateUserFriendlyMessage(commits, provider, apiKey, repository, diff) {
    try {
      console.log('🔍 [LLM] Generating user-friendly message:', {
        provider,
        hasApiKey: !!apiKey,
        commitCount: commits.length,
        repository: repository?.full_name
      });
      
      let rawResponse;
      if (provider === 'openai') {
        rawResponse = await this.generateWithOpenAI(commits, apiKey, repository, diff);
      } else if (provider === 'openrouter') {
        rawResponse = await this.generateWithOpenRouter(commits, apiKey, repository, diff);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      // Parse JSON response and format it
      return this.formatJsonResponse(rawResponse);
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
   * @param {string} diff - Git diff of the commit
   * @returns {Promise<string>} User-friendly message
   */
  async generateWithOpenAI(commits, apiKey, repository, diff) {
    this.initializeOpenAI(apiKey);

    const prompt = promptService.generatePushPrompt(commits, repository, diff);

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
      max_tokens: 2000,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  }

  /**
   * Generate message using OpenRouter (HTTP API)
   * @param {Array} commits - Array of commit objects
   * @param {string} apiKey - OpenRouter API key
   * @param {Object} repository - Repository information
   * @param {string} diff - Git diff of the commit
   * @returns {Promise<string>} User-friendly message
   */
  async generateWithOpenRouter(commits, apiKey, repository, diff) {
    console.log('🔍 [LLM] Starting OpenRouter generation:', {
      commitCount: commits.length,
      repoName: repository.name,
      hasApiKey: !!apiKey
    });
    
    console.log('🔍 [LLM] Commit messages to process:', {
      commitMessages: commits.map(commit => commit.message).join('\n').substring(0, 200) + (commits.map(commit => commit.message).join('\n').length > 200 ? '...' : ''),
      totalLength: commits.map(commit => commit.message).join('\n').length
    });

    const prompt = promptService.generatePushPrompt(commits, repository, diff);

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
        max_tokens: 2000,
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
   * Format JSON response from LLM into Discord message format
   * @param {string} rawResponse - Raw JSON response from LLM
   * @returns {string} Formatted message with "Update summary:" prefix
   */
  formatJsonResponse(rawResponse) {
    try {
      // Clean the response - remove any markdown code blocks
      const cleanedResponse = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse JSON
      const parsed = JSON.parse(cleanedResponse);
      
      // Format the message
      let formattedMessage = `Update summary: ${parsed.summary}`;
      
      if (parsed.changes && parsed.changes.length > 0) {
        formattedMessage += '\n\n' + parsed.changes.map(change => `• ${change}`).join('\n');
      }
      
      return formattedMessage;
    } catch (error) {
      console.error('❌ [LLM] JSON parsing error:', error);
      console.log('Raw response:', rawResponse);
      // Fallback to raw response if JSON parsing fails
      return rawResponse;
    }
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
