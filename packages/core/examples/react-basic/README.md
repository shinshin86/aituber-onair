# React Core Example

This is a simple React-based AI chat application powered by the [AITuber OnAir Core](https://www.npmjs.com/package/@aituber-onair/core) library.  
It allows users to interact with various AI chat models (OpenAI including GPT-5, Gemini, Claude) by configuring API keys and model settings through a user-friendly interface.  
The app supports both text and image (vision) chat, and provides real-time assistant responses with partial streaming.  

## Key Features

- **Multi-Provider Support**: Switchable chat providers (OpenAI, Gemini, Claude) and models
- **GPT-5 Support**: Full support for GPT-5 models with advanced configuration options
- **Response Length Control**: Adjustable response length from very short (40 tokens) to deep (5000 tokens)
- **GPT-5 Presets**: Quick configuration with presets (Casual, Balanced, Expert)
- **Advanced GPT-5 Settings**: 
  - Verbosity control (low, medium, high)
  - Reasoning effort adjustment (minimal, low, medium, high)
  - Endpoint preference selection (Chat Completions API, Responses API, Auto)
- **Vision Support**: Text and image (vision) chat capabilities
- **Real-time Streaming**: Assistant partial response streaming for better UX
- **Chat Management**: Full chat history management and clearing
- **Tool Integration**: Example tool implementation (randomInt)
- **MCP Support**: Optional DeepWiki MCP integration

## GPT-5 Configuration

When using GPT-5 models (GPT-5 Nano, Mini, GPT-5, or GPT-5 Chat Latest), the application provides specialized configuration options:

### Presets
- **Casual**: Fast responses for casual chat and quick questions (GPT-4 like experience)
- **Balanced**: Balanced reasoning for business tasks, learning, and general problem solving
- **Expert**: Deep reasoning for research, complex analysis, and expert-level tasks

### Custom Configuration
When selecting "Custom" preset, you can manually configure:
- **Verbosity**: Controls the detail level of responses
- **Reasoning Effort**: Adjusts the computational effort for reasoning tasks
- **Endpoint Preference**: Choose between Chat Completions API, Responses API, or automatic selection

This project is intended as a minimal, easy-to-understand example for integrating AITuber OnAir Core into a modern React application with full GPT-5 capabilities.
