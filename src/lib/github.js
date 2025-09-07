const axios = require('axios');

/**
 * GitHub API client for fetching commit diffs and additional data
 */
class GitHubService {
  constructor() {
    this.baseURL = 'https://api.github.com';
  }

  /**
   * Fetch detailed commit information including diff
   * @param {string} repoFullName - Repository full name (owner/repo)
   * @param {string} commitSha - Commit SHA
   * @param {string} githubToken - GitHub token (optional)
   * @returns {Promise<Object>} Detailed commit information
   */
  async fetchCommitDetails(repoFullName, commitSha, githubToken = null) {
    try {
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitTrack-Enhanced'
      };

      if (githubToken) {
        headers['Authorization'] = `token ${githubToken}`;
      }

      const response = await axios.get(
        `${this.baseURL}/repos/${repoFullName}/commits/${commitSha}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching commit details:', error.message);
      throw error;
    }
  }

  /**
   * Fetch commit diff
   * @param {string} repoFullName - Repository full name (owner/repo)
   * @param {string} commitSha - Commit SHA
   * @param {string} githubToken - GitHub token (optional)
   * @returns {Promise<string>} Commit diff
   */
  async fetchCommitDiff(repoFullName, commitSha, githubToken = null) {
    try {
      const headers = {
        'Accept': 'application/vnd.github.v3.diff',
        'User-Agent': 'GitTrack-Enhanced'
      };

      if (githubToken) {
        headers['Authorization'] = `token ${githubToken}`;
      }

      const response = await axios.get(
        `${this.baseURL}/repos/${repoFullName}/commits/${commitSha}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching commit diff:', error.message);
      throw error;
    }
  }

  /**
   * Fetch compare diff between two commits
   * @param {string} repoFullName - Repository full name (owner/repo)
   * @param {string} baseSha - Base commit SHA
   * @param {string} headSha - Head commit SHA
   * @param {string} githubToken - GitHub token (optional)
   * @returns {Promise<string>} Compare diff
   */
  async fetchCompareDiff(repoFullName, baseSha, headSha, githubToken = null) {
    try {
      const headers = {
        'Accept': 'application/vnd.github.v3.diff',
        'User-Agent': 'GitTrack-Enhanced'
      };

      if (githubToken) {
        headers['Authorization'] = `token ${githubToken}`;
      }

      const response = await axios.get(
        `${this.baseURL}/repos/${repoFullName}/compare/${baseSha}...${headSha}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching compare diff:', error.message);
      throw error;
    }
  }

  /**
   * Get repository information
   * @param {string} repoFullName - Repository full name (owner/repo)
   * @param {string} githubToken - GitHub token (optional)
   * @returns {Promise<Object>} Repository information
   */
  async getRepository(repoFullName, githubToken = null) {
    try {
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitTrack-Enhanced'
      };

      if (githubToken) {
        headers['Authorization'] = `token ${githubToken}`;
      }

      const response = await axios.get(
        `${this.baseURL}/repos/${repoFullName}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching repository:', error.message);
      throw error;
    }
  }

  /**
   * Extract meaningful changes from diff
   * @param {string} diff - Raw diff content
   * @returns {Object} Processed changes
   */
  extractChanges(diff) {
    const changes = {
      added: [],
      removed: [],
      modified: [],
      summary: ''
    };

    if (!diff) return changes;

    const lines = diff.split('\n');
    let currentFile = '';
    let addedLines = 0;
    let removedLines = 0;

    for (const line of lines) {
      // File header
      if (line.startsWith('diff --git')) {
        const match = line.match(/diff --git a\/(.+) b\/(.+)/);
        if (match) {
          currentFile = match[2];
        }
      }
      // New file
      else if (line.startsWith('new file mode')) {
        changes.added.push(currentFile);
      }
      // Deleted file
      else if (line.startsWith('deleted file mode')) {
        changes.removed.push(currentFile);
      }
      // Modified file
      else if (line.startsWith('index ')) {
        if (!changes.added.includes(currentFile) && !changes.removed.includes(currentFile)) {
          changes.modified.push(currentFile);
        }
      }
      // Added lines
      else if (line.startsWith('+') && !line.startsWith('+++')) {
        addedLines++;
      }
      // Removed lines
      else if (line.startsWith('-') && !line.startsWith('---')) {
        removedLines++;
      }
    }

    // Generate summary
    const totalFiles = changes.added.length + changes.removed.length + changes.modified.length;
    if (totalFiles > 0) {
      changes.summary = `${totalFiles} file${totalFiles > 1 ? 's' : ''} changed`;
      if (addedLines > 0) changes.summary += `, ${addedLines} addition${addedLines > 1 ? 's' : ''}`;
      if (removedLines > 0) changes.summary += `, ${removedLines} deletion${removedLines > 1 ? 's' : ''}`;
    }

    return changes;
  }

  /**
   * Check if repository is accessible
   * @param {string} repoFullName - Repository full name (owner/repo)
   * @param {string} githubToken - GitHub token (optional)
   * @returns {Promise<boolean>} True if accessible
   */
  async isRepositoryAccessible(repoFullName, githubToken = null) {
    try {
      await this.getRepository(repoFullName, githubToken);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new GitHubService();
