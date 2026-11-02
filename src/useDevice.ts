import { useSyncExternalStore } from 'react';
import type { Device } from './Screen';

// Phone layout below 768px, desktop layout from 768px up.
const query = '(min-width: 768px)';

export function useDevice(): Device {
  const desktop = useSyncExternalStore(
    (cb) => {
      const mq = matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => matchMedia(query).matches
  );
  return desktop ? 'desktop' : 'phone';
}
