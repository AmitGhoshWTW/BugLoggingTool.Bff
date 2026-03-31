// src/services/agentService.js

const AGENT_URL = 'http://localhost:42080';

class AgentService {
  constructor() {
    this.isInstalled = false;
    this.agentInfo = null;
  }

  // Check if agent is running
  async checkAgent() {
    try {
      const response = await fetch(`${AGENT_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        this.isInstalled = (data.status === 'ok');
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('[AgentService] Agent not detected:', error.message);
      this.isInstalled = false;
      return false;
    }
  }

  // Get agent information
  async getAgentInfo() {
    try {
      const response = await fetch(`${AGENT_URL}/api/info`);
      if (response.ok) {
        this.agentInfo = await response.json();
        return this.agentInfo;
      }
      return null;
    } catch (error) {
      console.error('[AgentService] Failed to get agent info:', error);
      return null;
    }
  }

  // Auto-collect log files
  async collectLogFiles() {
    try {
      const response = await fetch(`${AGENT_URL}/api/collect-logs`);
      
      if (!response.ok) {
        throw new Error(`Agent returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Collection failed');
      }

      console.log(`[AgentService] ✅ Collected ${data.collected} log files`);
      
      // Convert to File objects
      const files = data.files.map(fileData => {
        const blob = new Blob([fileData.content], { type: 'text/plain' });
        return new File([blob], fileData.filename, {
          type: 'text/plain',
          lastModified: fileData.lastModified
        });
      });

      return {
        success: true,
        files,
        errors: data.errors
      };
    } catch (error) {
      console.error('[AgentService] Collection error:', error);
      throw error;
    }
  }

  // Get configured log paths
  async getLogPaths() {
    try {
      const response = await fetch(`${AGENT_URL}/api/log-paths`);
      if (response.ok) {
        const data = await response.json();
        return data.paths;
      }
      return [];
    } catch (error) {
      console.error('[AgentService] Failed to get log paths:', error);
      return [];
    }
  }

  // Add custom log path
  async addLogPath(path) {
    try {
      const response = await fetch(`${AGENT_URL}/api/log-paths`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      
      return response.ok;
    } catch (error) {
      console.error('[AgentService] Failed to add log path:', error);
      return false;
    }
  }

  // Test if path is accessible
  async testPath(path) {
    try {
      const response = await fetch(`${AGENT_URL}/api/test-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('[AgentService] Failed to test path:', error);
      return null;
    }
  }
}

export const agentService = new AgentService();