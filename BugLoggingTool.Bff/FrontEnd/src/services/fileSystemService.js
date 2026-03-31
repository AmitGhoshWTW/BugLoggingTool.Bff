// src/services/fileSystemService.js

class FileSystemService {
    constructor() {
      this.isElectron = this.detectElectron();
      this.configuredPaths = this.loadConfiguredPaths();
    }
  
    detectElectron() {
      return !!(window.electronAPI?.isElectron);
    }
  
    async autoCollectLogFiles() {
      console.log('[FileSystemService] Auto-collecting log files...');
  
      if (!this.isElectron) {
        throw new Error('Auto-collect requires Desktop App. Please download from banner below.');
      }
  
      const collectedFiles = [];
      const errors = [];
  
      for (const pathConfig of this.configuredPaths) {
        try {
          const fileData = await window.electronAPI.readLogFile(pathConfig.path);
          
          if (fileData) {
            collectedFiles.push({
              name: pathConfig.name,
              path: pathConfig.path,
              file: this.createFileFromData(fileData),
              success: true
            });
            console.log(`[FileSystemService] ✅ Collected: ${pathConfig.name}`);
          }
        } catch (error) {
          errors.push({
            name: pathConfig.name,
            path: pathConfig.path,
            error: error.message
          });
        }
      }
  
      return { collectedFiles, errors };
    }
  
    createFileFromData(fileData) {
      const blob = new Blob([fileData.content], { type: 'text/plain' });
      const file = new File([blob], fileData.filename, {
        type: 'text/plain',
        lastModified: fileData.lastModified || Date.now()
      });
      return file;
    }
  
    // ... rest of methods
  }
  
  export const fileSystemService = new FileSystemService();
  