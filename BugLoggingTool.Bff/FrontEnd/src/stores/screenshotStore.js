// src/stores/screenshotStore.js
import eventBus from '../utils/eventBus';

/**
 * Temporary in-memory store for screenshots before saving
 */
class ScreenshotStore {
  constructor() {
    this.screenshots = [];
    this.nextId = 1;
  }

  /**
   * Add a screenshot blob to temporary storage
   */
  add(blob, metadata = {}) {
    const id = `temp_${this.nextId++}`;
    const url = URL.createObjectURL(blob);
    
    const screenshot = {
      id,
      blob,
      url,
      metadata: {
        from: metadata.from || 'browser',
        description: metadata.description || 'Screenshot',
        timestamp: metadata.timestamp || Date.now(),
        ...metadata
      },
      createdAt: new Date().toISOString()
    };

    this.screenshots.push(screenshot);
    
    console.log('[ScreenshotStore] Added screenshot:', id);
    eventBus.emit('temp-screenshots-changed', this.getAll());
    
    return id;
  }

  /**
   * Remove a screenshot from temporary storage
   */
  remove(id) {
    const index = this.screenshots.findIndex(s => s.id === id);
    if (index !== -1) {
      const screenshot = this.screenshots[index];
      
      // Revoke blob URL to free memory
      URL.revokeObjectURL(screenshot.url);
      
      this.screenshots.splice(index, 1);
      console.log('[ScreenshotStore] Removed screenshot:', id);
      eventBus.emit('temp-screenshots-changed', this.getAll());
    }
  }

  /**
   * Get all temporary screenshots
   */
  getAll() {
    return [...this.screenshots];
  }

  /**
   * Clear all temporary screenshots
   */
  clear() {
    // Revoke all blob URLs
    this.screenshots.forEach(s => {
      URL.revokeObjectURL(s.url);
    });
    
    this.screenshots = [];
    console.log('[ScreenshotStore] Cleared all screenshots');
    eventBus.emit('temp-screenshots-changed', []);
  }

  /**
   * Get count
   */
  count() {
    return this.screenshots.length;
  }
}

// Export singleton instance
export const screenshotStore = new ScreenshotStore();