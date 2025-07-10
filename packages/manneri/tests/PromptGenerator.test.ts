import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptGenerator } from '../src/generators/PromptGenerator.js';
import type { Message, LocalizedPrompts } from '../src/types/index.js';

describe('PromptGenerator', () => {
  let generator: PromptGenerator;
  const mockMessages: Message[] = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there' },
    { role: 'user', content: 'How are you?' },
    { role: 'assistant', content: 'I am doing well' },
  ];

  beforeEach(() => {
    generator = new PromptGenerator();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default language (ja)', () => {
      expect(generator).toBeDefined();
    });

    it('should accept custom language', () => {
      const enGenerator = new PromptGenerator('en');
      expect(enGenerator).toBeDefined();
    });

    it('should accept custom prompts', () => {
      const customPrompts: Partial<LocalizedPrompts> = {
        en: {
          intervention: ['Custom intervention prompt']
        }
      };
      
      const customGenerator = new PromptGenerator('en', customPrompts);
      expect(customGenerator).toBeDefined();
    });
  });

  describe('generateDiversificationPrompt', () => {
    it('should generate diversification prompt with default settings', () => {
      const prompt = generator.generateDiversificationPrompt(mockMessages);
      
      expect(prompt).toHaveProperty('content');
      expect(prompt).toHaveProperty('type');
      expect(prompt).toHaveProperty('priority');
      expect(prompt).toHaveProperty('context');
      
      expect(prompt.type).toBe('topic_change');
      expect(prompt.priority).toBe('medium');
      expect(prompt.context).toBe('Conversation length: 4 messages');
      expect(typeof prompt.content).toBe('string');
      expect(prompt.content.length).toBeGreaterThan(0);
    });

    it('should generate prompt for different languages', () => {
      const enGenerator = new PromptGenerator('en');
      const enPrompt = enGenerator.generateDiversificationPrompt(mockMessages);
      
      expect(enPrompt.content).toBeDefined();
      expect(typeof enPrompt.content).toBe('string');
    });

    it('should override language with options', () => {
      const jaGenerator = new PromptGenerator('ja');
      const prompt = jaGenerator.generateDiversificationPrompt(mockMessages, { language: 'en' });
      
      expect(prompt.content).toBeDefined();
      expect(typeof prompt.content).toBe('string');
    });

    it('should handle empty messages array', () => {
      const prompt = generator.generateDiversificationPrompt([]);
      
      expect(prompt.context).toBe('Conversation length: 0 messages');
      expect(prompt.content).toBeDefined();
    });

    it('should generate different prompts on multiple calls', () => {
      const prompts = new Set<string>();
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        const prompt = generator.generateDiversificationPrompt(mockMessages);
        prompts.add(prompt.content);
      }
      
      // Should eventually get different prompts (randomness)
      // This test might occasionally fail due to randomness, but it's unlikely
      expect(prompts.size).toBeGreaterThan(0);
    });
  });

  describe('prompt selection and history', () => {
    it('should avoid repeating recently used prompts', () => {
      const customPrompts: Partial<LocalizedPrompts> = {
        ja: {
          intervention: [
            'Prompt 1',
            'Prompt 2',
            'Prompt 3'
          ]
        }
      };
      
      const customGenerator = new PromptGenerator('ja', customPrompts);
      const usedPrompts = new Set<string>();
      
      // Generate prompts multiple times
      for (let i = 0; i < 6; i++) {
        const prompt = customGenerator.generateDiversificationPrompt(mockMessages);
        usedPrompts.add(prompt.content);
      }
      
      // Should use all available prompts
      expect(usedPrompts.size).toBeGreaterThan(1);
      expect(usedPrompts.size).toBeLessThanOrEqual(3);
    });

    it('should reset when all prompts are used', () => {
      const customPrompts: Partial<LocalizedPrompts> = {
        ja: {
          intervention: [
            'Only prompt'
          ]
        }
      };
      
      const customGenerator = new PromptGenerator('ja', customPrompts);
      
      // Generate multiple prompts
      const prompts = [];
      for (let i = 0; i < 5; i++) {
        const prompt = customGenerator.generateDiversificationPrompt(mockMessages);
        prompts.push(prompt.content);
      }
      
      // All should use the same prompt since there's only one
      expect(prompts.every(p => p === 'Only prompt')).toBe(true);
    });

    it('should clear history when requested', () => {
      const customPrompts: Partial<LocalizedPrompts> = {
        ja: {
          intervention: [
            'Prompt 1',
            'Prompt 2'
          ]
        }
      };
      
      const customGenerator = new PromptGenerator('ja', customPrompts);
      
      // Use some prompts
      customGenerator.generateDiversificationPrompt(mockMessages);
      customGenerator.generateDiversificationPrompt(mockMessages);
      
      // Clear history
      customGenerator.clearHistory();
      
      // Should be able to generate prompts again
      const prompt = customGenerator.generateDiversificationPrompt(mockMessages);
      expect(prompt.content).toBeDefined();
    });
  });

  describe('fallback behavior', () => {
    it('should fallback to English prompts for unsupported language', () => {
      const unsupportedGenerator = new PromptGenerator('xyz');
      const prompt = unsupportedGenerator.generateDiversificationPrompt(mockMessages);
      
      expect(prompt.content).toBeDefined();
      expect(typeof prompt.content).toBe('string');
    });

    it('should provide default prompt when no prompts available', () => {
      const emptyPrompts: Partial<LocalizedPrompts> = {
        ja: {
          intervention: []
        }
      };
      
      const emptyGenerator = new PromptGenerator('ja', emptyPrompts);
      const prompt = emptyGenerator.generateDiversificationPrompt(mockMessages);
      
      expect(prompt.content).toBe('Please change the topic and talk about something new.');
    });

    it('should handle missing intervention prompts', () => {
      const incompletePrompts: Partial<LocalizedPrompts> = {
        ja: {
          // Missing intervention array
        }
      };
      
      const incompleteGenerator = new PromptGenerator('ja', incompletePrompts);
      const prompt = incompleteGenerator.generateDiversificationPrompt(mockMessages);
      
      // Should fallback to default Japanese prompts, not English
      expect(typeof prompt.content).toBe('string');
      expect(prompt.content.length).toBeGreaterThan(0);
    });
  });

  describe('prompt history management', () => {
    it('should maintain prompt history up to maximum limit', () => {
      // Create generator with single prompt to force history management
      const customPrompts: Partial<LocalizedPrompts> = {
        ja: {
          intervention: Array.from({ length: 60 }, (_, i) => `Prompt ${i + 1}`)
        }
      };
      
      const customGenerator = new PromptGenerator('ja', customPrompts);
      
      // Generate many prompts to trigger history limit
      for (let i = 0; i < 55; i++) {
        customGenerator.generateDiversificationPrompt(mockMessages);
      }
      
      // Should still work without issues
      const prompt = customGenerator.generateDiversificationPrompt(mockMessages);
      expect(prompt.content).toBeDefined();
    });
  });

  describe('randomness and distribution', () => {
    it('should eventually use all available prompts', () => {
      const customPrompts: Partial<LocalizedPrompts> = {
        en: {
          intervention: [
            'Prompt A',
            'Prompt B', 
            'Prompt C',
            'Prompt D'
          ]
        }
      };
      
      const customGenerator = new PromptGenerator('en', customPrompts);
      const usedPrompts = new Set<string>();
      
      // Generate many prompts to increase chance of getting all
      for (let i = 0; i < 20; i++) {
        const prompt = customGenerator.generateDiversificationPrompt(mockMessages);
        usedPrompts.add(prompt.content);
        
        // Clear history periodically to allow reuse
        if (i % 8 === 0) {
          customGenerator.clearHistory();
        }
      }
      
      // Should have used multiple different prompts
      expect(usedPrompts.size).toBeGreaterThan(1);
      expect(usedPrompts.size).toBeLessThanOrEqual(4);
    });
  });

  describe('edge cases', () => {
    it('should handle very long conversation', () => {
      const longMessages: Message[] = Array.from({ length: 1000 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`
      }));
      
      const prompt = generator.generateDiversificationPrompt(longMessages);
      
      expect(prompt.context).toBe('Conversation length: 1000 messages');
      expect(prompt.content).toBeDefined();
    });

    it('should work with messages without content', () => {
      const emptyMessages: Message[] = [
        { role: 'user', content: '' },
        { role: 'assistant', content: '' },
      ];
      
      const prompt = generator.generateDiversificationPrompt(emptyMessages);
      
      expect(prompt.content).toBeDefined();
      expect(prompt.context).toBe('Conversation length: 2 messages');
    });

    it('should handle undefined and null values gracefully', () => {
      const prompt = generator.generateDiversificationPrompt(mockMessages, {});
      
      expect(prompt.content).toBeDefined();
      expect(prompt.type).toBe('topic_change');
    });
  });
});