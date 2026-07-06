import { useEffect, useState } from 'react';

export function useBlink() {
  const [eyesClosed, setEyesClosed] = useState(false);

  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    let openTimeout: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      const interval = 2000 + Math.random() * 4000;
      blinkTimeout = setTimeout(() => {
        setEyesClosed(true);
        openTimeout = setTimeout(
          () => {
            setEyesClosed(false);
            scheduleBlink();
          },
          100 + Math.random() * 100,
        );
      }, interval);
    };

    scheduleBlink();
    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(openTimeout);
    };
  }, []);

  return eyesClosed;
}
