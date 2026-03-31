// src/utils/eventBus.js
const eventBus = {
  emit(event, data) {
    console.log(`[EventBus] 📢 Emitting: ${event}`, data);
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  },
  
  on(event, callback) {
    console.log(`[EventBus] 👂 Registered listener for: ${event}`);
    // Wrap callback to extract detail from CustomEvent
    const wrappedCallback = (e) => {
      console.log(`[EventBus] 📨 Received: ${event}`, e.detail);
      callback(e.detail);
    };
    // Store original callback reference for removal
    wrappedCallback._original = callback;
    window.addEventListener(event, wrappedCallback);
  },
  
  off(event, callback) {
    console.log(`[EventBus] 🔇 Removing listener for: ${event}`);
    // Find the wrapped callback
    const listeners = window.getEventListeners?.(window)[event] || [];
    const listener = listeners.find(l => l.listener._original === callback);
    if (listener) {
      window.removeEventListener(event, listener.listener);
    }
  },
  
  // Debug: List all active listeners
  listListeners() {
    console.log('[EventBus] Active event listeners:');
    const listeners = window.getEventListeners?.(window) || {};
    Object.keys(listeners).forEach(event => {
      if (!event.startsWith('webkit') && !event.startsWith('drag')) {
        console.log(`  ${event}: ${listeners[event].length} listeners`);
      }
    });
  }
};

export default eventBus;