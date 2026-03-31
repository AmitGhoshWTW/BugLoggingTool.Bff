// src/hooks/useAutoRefresh.js
import { useEffect, useRef } from 'react';
import { localDB } from '../services/pouchdbService';

/**
 * Hook to auto-refresh when database changes
 */
export function useAutoRefresh(callback, interval = 2000) {
  const lastSeqRef = useRef(null);
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let timeoutId;

    async function checkForChanges() {
      try {
        const info = await localDB.info();
        
        // First run - just store the sequence
        if (lastSeqRef.current === null) {
          lastSeqRef.current = info.update_seq;
          console.log('[useAutoRefresh] Initial seq:', info.update_seq);
        } 
        // Sequence changed - data was updated
        else if (info.update_seq !== lastSeqRef.current) {
          console.log('[useAutoRefresh] 🔄 Database changed!', {
            old: lastSeqRef.current,
            new: info.update_seq
          });
          
          lastSeqRef.current = info.update_seq;
          
          // Call the callback
          if (callbackRef.current) {
            callbackRef.current();
          }
        }
      } catch (error) {
        console.error('[useAutoRefresh] Error checking changes:', error);
      }

      // Schedule next check
      timeoutId = setTimeout(checkForChanges, interval);
    }

    // Start checking
    checkForChanges();

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [interval]);
}