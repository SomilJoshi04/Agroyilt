import { useState, useEffect } from 'react';

/**
 * A robust hook to detect if a mobile virtual keyboard is open.
 * Uses the VisualViewport API to calculate keyboard height and state.
 * Works seamlessly across Android, iOS, and different browser behaviors.
 */
export const useKeyboardVisibility = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Only apply on client side and mobile devices (basic width check)
    if (typeof window === 'undefined' || window.innerWidth > 1024) return;

    // A conservative threshold for mobile keyboards (usually > 200px)
    const MIN_KEYBOARD_HEIGHT = 150;
    
    // Store the maximum layout height we've seen (helps handle address bar changes)
    let maxLayoutHeight = window.innerHeight;

    const handleResize = () => {
      const currentInnerHeight = window.innerHeight;
      const currentVisualHeight = window.visualViewport?.height || currentInnerHeight;
      
      // Update our known max layout height (in case of orientation change or address bar hiding)
      maxLayoutHeight = Math.max(maxLayoutHeight, currentInnerHeight);

      // Modern Android Chrome uses `resizes-content` so innerHeight itself shrinks.
      // iOS Safari and older browsers keep innerHeight static while visualViewport shrinks.
      // By checking the difference against BOTH the current visual height and our max historical height,
      // we can accurately detect the keyboard regardless of the browser's viewport behavior.
      const diffFromMax = maxLayoutHeight - currentVisualHeight;
      const diffFromCurrent = currentInnerHeight - currentVisualHeight;

      const detectedKeyboardHeight = Math.max(diffFromMax, diffFromCurrent);

      if (detectedKeyboardHeight > MIN_KEYBOARD_HEIGHT) {
        setIsKeyboardOpen(true);
        setKeyboardHeight(detectedKeyboardHeight);
      } else {
        setIsKeyboardOpen(false);
        setKeyboardHeight(0);
      }
    };

    // Attach listeners
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    // Initial check
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  return { isKeyboardOpen, keyboardHeight };
};
