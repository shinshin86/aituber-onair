export function resolveLanguage(language?: 'ja' | 'en' | 'auto'): 'ja' | 'en' {
  return language === 'en' ? 'en' : 'ja';
}
