import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useFrameworkReady() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(
      () => {
        setIsReady(true);
      },
      Platform.OS === 'web' ? 0 : 100
    );

    return () => clearTimeout(timeout);
  }, []);

  return isReady;
}
