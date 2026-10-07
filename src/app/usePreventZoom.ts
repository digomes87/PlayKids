import { useEffect } from 'react';

/** Bloqueia zoom por pinça (o Safari ignora `user-scalable=no` na meta viewport). */
export function usePreventZoom(): void {
  useEffect(() => {
    const preventDefault = (event: Event) => event.preventDefault();
    const blockMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };

    document.addEventListener('gesturestart', preventDefault);
    document.addEventListener('gesturechange', preventDefault);
    document.addEventListener('touchmove', blockMultiTouch, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', preventDefault);
      document.removeEventListener('gesturechange', preventDefault);
      document.removeEventListener('touchmove', blockMultiTouch);
    };
  }, []);
}
