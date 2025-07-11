# @aituber-onair/manneri

![AITuber OnAir Manneri - logo](./images/aituber-onair-manneri.png)

**Manneri** is a simple JavaScript library designed to detect repetitive conversation patterns in AI chatbots and provide topic diversification prompts for more engaging conversations.

[日本語版README](README.ja.md) | [English README](README.md)

## Features

- 🔍 **Conversation Similarity Analysis**: Calculate text similarity to detect repetitive patterns
- 📊 **Pattern Detection**: Identify structural patterns in conversations
- 🎯 **Keyword Analysis**: Detect overused vocabulary and topic bias
- 💡 **Automatic Prompt Generation**: Generate appropriate prompts for topic diversification
- 🌐 **Frontend-Only**: Lightweight operation optimized for browser environments
- 🌍 **Multi-Language Support**: Built-in support for Japanese and English, with easy extension to any language via custom prompts
- 🎨 **Customizable Prompts**: Configure intervention messages and recommendations for any language
- 🇯🇵 **Japanese Language Support**: Proper handling of Japanese text (Hiragana, Katakana, Kanji)
- 💾 **Flexible Persistence**: Configurable data persistence with support for multiple storage backends

## Installation

```bash
npm install @aituber-onair/manneri
```

## Basic Usage

```typescript
import { ManneriDetector, LocalStoragePersistenceProvider } from '@aituber-onair/manneri';

// Create ManneriDetector with default settings
const detector = new ManneriDetector();

// Define message array
const messages = [
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hello! How can I help you today?' },
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hello! What can I assist you with?' }
];

// Detect repetitive patterns
if (detector.detectManneri(messages)) {
  console.log('Repetitive conversation detected');
}

// Check if intervention is needed (considering cooldown)
if (detector.shouldIntervene(messages)) {
  // Generate topic diversification prompt
  const prompt = detector.generateDiversificationPrompt(messages);
  console.log('Suggested prompt:', prompt.content);
}
```

## Configuration Options

```typescript
const detector = new ManneriDetector({
  similarityThreshold: 0.75,     // Similarity threshold (0-1)
  repetitionLimit: 3,            // Number of repetitions to detect
  lookbackWindow: 10,            // Number of messages to analyze
  interventionCooldown: 300000,  // Intervention interval (milliseconds)
  minMessageLength: 10,          // Minimum character count for analysis
  excludeKeywords: ['yes', 'no'], // Keywords to exclude
  enableTopicTracking: true,     // Enable topic tracking
  enableKeywordAnalysis: true,   // Enable keyword analysis
  debugMode: false,              // Debug mode
  language: 'en',                // Language for prompts ('ja' | 'en' | custom)
  customPrompts: {               // Custom intervention prompts (optional)
    en: {
      intervention: [
        'Please change the topic and talk about something new.',
        'Let\'s explore a different subject.',
        'How about discussing something else?'
      ]
    }
  }
}, {
  // Optional: Configure persistence provider
  persistenceProvider: new LocalStoragePersistenceProvider({
    storageKey: 'my_manneri_data',
    version: '1.0.0'
  })
});
```

## Integration with AITuberOnAirCore

```typescript
import { ManneriDetector } from '@aituber-onair/manneri';

const manneriDetector = new ManneriDetector({
  similarityThreshold: 0.8,
  repetitionLimit: 3,
  interventionCooldown: 300000
});

// Integration via AITuberOnAirCore event listener
core.on('beforeAIRequest', (requestData) => {
  const chatHistory = core.getChatHistory();
  
  if (manneriDetector.shouldIntervene(chatHistory)) {
    const diversificationPrompt = manneriDetector.generateDiversificationPrompt(chatHistory);
    
    // Add topic change instruction as system prompt
    requestData.messages.unshift({
      role: 'system',
      content: diversificationPrompt.content
    });
    
    console.log('Applied diversification prompt:', diversificationPrompt.type);
  }
});
```

## Event Handling

```typescript
// Similarity calculation event
detector.on('similarity_calculated', (data) => {
  console.log(`Similarity: ${data.score}, Threshold: ${data.threshold}`);
});

// Pattern detection event
detector.on('pattern_detected', (result) => {
  console.log('Detected patterns:', result.patterns);
});

// Intervention triggered event
detector.on('intervention_triggered', (prompt) => {
  console.log('Intervention executed:', prompt.content);
});

// Configuration update event
detector.on('config_updated', (newConfig) => {
  console.log('Configuration updated:', newConfig);
});
```

## Detailed Analysis

```typescript
// Perform detailed conversation analysis
const analysis = detector.analyzeConversation(messages);

console.log('Analysis result:', {
  similarity: analysis.similarity,
  topics: analysis.topics,
  patterns: analysis.patterns,
  shouldIntervene: analysis.shouldIntervene,
  reason: analysis.interventionReason
});

// Get statistics
const stats = detector.getStatistics();
console.log('Statistics:', {
  totalInterventions: stats.totalInterventions,
  averageInterval: stats.averageInterventionInterval,
  thresholds: stats.configuredThresholds
});
```

## Multi-Language Support

### Language Configuration

```typescript
// Use English prompts
const detectorEn = new ManneriDetector({
  language: 'en'
});

// Use Japanese prompts (default)
const detectorJa = new ManneriDetector({
  language: 'ja'
});

// Custom prompts for Spanish
const detectorSpanish = new ManneriDetector({
  language: 'es',
  customPrompts: {
    es: {
      intervention: [
        'Cambiemos de tema y hablemos de algo nuevo.',
        'Exploremos un tema diferente.',
        '¿Qué tal si discutimos otra cosa?'
      ]
    }
  }
});

// Chinese support
const detectorChinese = new ManneriDetector({
  language: 'zh',
  customPrompts: {
    zh: {
      intervention: [
        '让我们换个话题，聊些新的内容。',
        '我们来探讨一个不同的主题。',
        '要不要讨论别的事情？'
      ]
    }
  }
});
```

### Built-in Language Support

Manneri comes with built-in prompts for:
- **Japanese** (`'ja'`) - Default language
- **English** (`'en'`) - Full prompt coverage

```typescript
import { DEFAULT_PROMPTS } from '@aituber-onair/manneri';

// View available built-in languages
console.log(Object.keys(DEFAULT_PROMPTS)); // ['ja', 'en']

// Access specific language prompts
const englishPrompts = DEFAULT_PROMPTS.en;
console.log(englishPrompts.intervention);
```

### Adding Any Language

**Any language can be supported** by providing custom prompts. The library accepts any language code and uses your custom prompts:

```typescript
// Add support for any language (French example)
const detectorFrench = new ManneriDetector({
  language: 'fr',
  customPrompts: {
    fr: {
      intervention: [
        'Changeons de sujet et parlons de quelque chose de nouveau.',
        'Explorons un sujet différent.',
        'Que diriez-vous de discuter d\'autre chose?'
      ]
    }
  }
});

// Or extend existing languages
import { overridePrompts, DEFAULT_PROMPTS } from '@aituber-onair/manneri';

const multilingualPrompts = overridePrompts(DEFAULT_PROMPTS, {
  zh: {
    intervention: ['让我们换个话题，聊些新的内容。']
  },
  ko: {
    intervention: ['새로운 주제로 변경해 주세요.']
  },
  fr: {
    intervention: ['Changeons de sujet.']
  }
});
```

### Language-Agnostic Design

The library is designed to work with **any language** without code changes:

```typescript
// Easy language switching
const createDetectorForLanguage = (lang: string, prompts: any) => {
  return new ManneriDetector({
    language: lang,
    customPrompts: { [lang]: prompts }
  });
};

// Support multiple languages in the same application
const detectors = {
  english: createDetectorForLanguage('en', englishPrompts),
  chinese: createDetectorForLanguage('zh', chinesePrompts),
  korean: createDetectorForLanguage('ko', koreanPrompts),
  arabic: createDetectorForLanguage('ar', arabicPrompts),
  // Add any language
};

// Dynamic language detection
const getUserLanguage = () => navigator.language.split('-')[0];
const userDetector = detectors[getUserLanguage()] || detectors.english;
```

### Prompt Utilities

```typescript
import { getPromptTemplate, overridePrompts } from '@aituber-onair/manneri';

// Get intervention prompt for any language
const interventionPrompt = getPromptTemplate(
  myCustomPrompts, 
  'zh'
);

// Override default prompts with custom ones
const globalPrompts = overridePrompts(DEFAULT_PROMPTS, {
  zh: { intervention: ['换个话题吧'] },
  ko: { intervention: ['주제를 바꿔주세요'] },
  es: { intervention: ['Cambiemos de tema'] }
});
```

## Individual Feature Usage

### Similarity Analysis

```typescript
import { SimilarityAnalyzer } from '@aituber-onair/manneri';

const analyzer = new SimilarityAnalyzer();
const similarity = analyzer.calculateSimilarity('Hello', 'Hello, how are you?');
console.log('Similarity:', similarity); // 0.0 - 1.0
```

### Keyword Extraction

```typescript
import { KeywordExtractor } from '@aituber-onair/manneri';

const extractor = new KeywordExtractor();
const keywords = extractor.extractKeywordsFromMessages(messages);
console.log('Keywords:', keywords);
```

### Pattern Detection

```typescript
import { PatternDetector } from '@aituber-onair/manneri';

const detector = new PatternDetector();
const result = detector.detectPatterns(messages);
console.log('Patterns:', result.patterns);
console.log('Severity:', result.severity);
console.log('Confidence:', result.confidence);
```

## Data Persistence

Manneri provides flexible persistence through configurable providers. You have full control over when and how data is saved.

### Browser Environment (LocalStorage)

```typescript
import { ManneriDetector, LocalStoragePersistenceProvider } from '@aituber-onair/manneri';

// Configure with LocalStorage persistence
const detector = new ManneriDetector({
  // ... configuration options
}, {
  persistenceProvider: new LocalStoragePersistenceProvider({
    storageKey: 'manneri_data',  // Custom storage key
    version: '1.0.0'             // Data version
  })
});

// Manual persistence control
await detector.save();    // Save current state
await detector.load();    // Load saved state
await detector.cleanup(); // Clean up old data

// Check if persistence is available
if (detector.hasPersistenceProvider()) {
  console.log('Persistence is configured');
  
  // Get storage info
  const info = detector.getPersistenceInfo();
  console.log('Storage info:', info);
}

// Event handling for persistence operations
detector.on('save_success', ({ timestamp }) => {
  console.log('Data saved successfully at', new Date(timestamp));
});

detector.on('save_error', ({ error }) => {
  console.error('Failed to save data:', error);
});

detector.on('load_success', ({ data, timestamp }) => {
  console.log('Data loaded successfully:', data);
});

detector.on('cleanup_completed', ({ removedItems, timestamp }) => {
  console.log(`Cleaned up ${removedItems} old items`);
});
```

### Custom Persistence Provider

For Node.js, Deno, or custom storage solutions, implement the `PersistenceProvider` interface:

```typescript
import type { PersistenceProvider, StorageData } from '@aituber-onair/manneri';

// Example: Database persistence provider
class DatabasePersistenceProvider implements PersistenceProvider {
  constructor(private dbConnection: any) {}

  async save(data: StorageData): Promise<boolean> {
    try {
      await this.dbConnection.query(
        'INSERT OR REPLACE INTO manneri_data (id, data) VALUES (?, ?)',
        [1, JSON.stringify(data)]
      );
      return true;
    } catch (error) {
      console.error('Database save failed:', error);
      return false;
    }
  }

  async load(): Promise<StorageData | null> {
    try {
      const result = await this.dbConnection.query(
        'SELECT data FROM manneri_data WHERE id = ?',
        [1]
      );
      return result.length > 0 ? JSON.parse(result[0].data) : null;
    } catch (error) {
      console.error('Database load failed:', error);
      return null;
    }
  }

  async clear(): Promise<boolean> {
    try {
      await this.dbConnection.query('DELETE FROM manneri_data WHERE id = ?', [1]);
      return true;
    } catch (error) {
      console.error('Database clear failed:', error);
      return false;
    }
  }

  async cleanup(maxAge: number): Promise<number> {
    // Implement cleanup logic for your storage
    // Return number of items removed
    return 0;
  }
}

// Use custom persistence provider
const detector = new ManneriDetector({
  // ... configuration
}, {
  persistenceProvider: new DatabasePersistenceProvider(dbConnection)
});
```

### Manual Data Management (No Persistence)

```typescript
// Use without persistence provider
const detector = new ManneriDetector();

// Manual export/import for custom storage
const data = detector.exportData();
// Store data however you want (file, database, etc.)
await myCustomStorage.save(data);

// Restore data
const restoredData = await myCustomStorage.load();
detector.importData(restoredData);

// Clear history
detector.clearHistory();
```

### Environment-Specific Examples

```typescript
// Browser-only with LocalStorage
const browserDetector = new ManneriDetector({}, {
  persistenceProvider: new LocalStoragePersistenceProvider()
});

// Node.js with file storage
class FilePersistenceProvider implements PersistenceProvider {
  constructor(private filePath: string) {}
  
  save(data: StorageData): boolean {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
  
  load(): StorageData | null {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  
  clear(): boolean {
    try {
      fs.unlinkSync(this.filePath);
      return true;
    } catch {
      return false;
    }
  }
}

const nodeDetector = new ManneriDetector({}, {
  persistenceProvider: new FilePersistenceProvider('./manneri-data.json')
});

// Deno with Deno.KV
class DenoKvPersistenceProvider implements PersistenceProvider {
  constructor(private kv: Deno.Kv) {}
  
  async save(data: StorageData): Promise<boolean> {
    try {
      await this.kv.set(['manneri', 'data'], data);
      return true;
    } catch {
      return false;
    }
  }
  
  async load(): Promise<StorageData | null> {
    try {
      const result = await this.kv.get(['manneri', 'data']);
      return result.value as StorageData | null;
    } catch {
      return null;
    }
  }
  
  async clear(): Promise<boolean> {
    try {
      await this.kv.delete(['manneri', 'data']);
      return true;
    } catch {
      return false;
    }
  }
}

const kv = await Deno.openKv();
const denoDetector = new ManneriDetector({}, {
  persistenceProvider: new DenoKvPersistenceProvider(kv)
});
```

## TypeScript Type Definitions

```typescript
import type { 
  Message,
  ManneriConfig,
  AnalysisResult,
  DiversificationPrompt,
  LocalizedPrompts,
  PromptTemplates,
  SupportedLanguage,
  PersistenceProvider,
  PersistenceConfig,
  StorageData
} from '@aituber-onair/manneri';
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Lightweight: < 50KB gzipped
- Fast: Real-time analysis < 100ms
- Memory efficient: Automatic cache cleanup

## License

MIT License

## Contributing

Pull requests and issues are welcome. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Support

- GitHub Issues: https://github.com/shinshin86/aituber-onair/issues
- Documentation: https://github.com/shinshin86/aituber-onair/tree/main/packages/manneri

## Related Projects

- [AITuber OnAir](https://github.com/shinshin86/aituber-onair) - Main project
- [@aituber-onair/core](https://github.com/shinshin86/aituber-onair/tree/main/packages/core) - Core library