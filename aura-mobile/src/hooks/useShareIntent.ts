import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

export function useShareIntent() {
  const [sharedText, setSharedText] = useState<string | null>(null);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleShareUrl(url);
    });

    const handler = Linking.addEventListener('url', ({ url }) => {
      if (url) handleShareUrl(url);
    });

    return () => handler.remove();
  }, []);

  function handleShareUrl(url: string) {
    const text = extractText(url);
    if (text) setSharedText(text);
  }

  function extractText(url: string): string | null {
    try {
      const parsed = new URL(url);
      const text = parsed.searchParams.get('text') || parsed.searchParams.get('message');
      return text || null;
    } catch {
      return url.includes('://') ? url : null;
    }
  }

  const clearSharedText = () => setSharedText(null);

  return { sharedText, clearSharedText };
}