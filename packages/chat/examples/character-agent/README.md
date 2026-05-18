# AITuber Secretary Agent Example

## Overview

This example shows how to use AITuber OnAir Chat to make an AI character act as a secretary agent for streamers and creators. The character can talk naturally while calling tools to organize the user's work.

## Concept

The AI character is more than a chat partner. It helps with memos, todos, schedule suggestions, message drafts, simple memory saving, and simple memory search. The first version is intentionally local and safe, so it focuses on proposing, drafting, and saving instead of taking external actions.

## Features

- Talk as an AI character
- Save memos
- Create todos
- Create schedule suggestions
- Draft announcements, replies, email text, and social post text
- Save simple memories
- Search simple memories
- Save data to local JSON files
- Safe sample that does not send data to external services

## Tools

- `memo.save`: Saves an important note to `data/memos.json`.
- `todo.create`: Creates a todo in `data/todos.json`.
- `schedule.suggest`: Saves a schedule suggestion to `data/schedules.json`.
- `draft.create`: Saves an email, post, announcement, or reply draft to `data/drafts.json`.
- `memory.save`: Saves useful long-term context to `data/memories.json`.
- `memory.search`: Searches saved memories by subject and content.

When the tools are registered with a chat provider, the example converts these logical names to provider-safe function names such as `memo_save` and `todo_create`. This keeps the README and local registry easy to read while avoiding provider function-name restrictions.

## Safety Model

This sample uses a conservative safety model.

- Do not send emails.
- Do not post to social media.
- Do not register calendar events.
- Save schedules as schedule suggestions.
- Save posts and replies as drafts.
- Store data in local JSON files.

The character prompt also tells the assistant not to claim that it sent emails, posted to social media, or registered calendar events.

## TDD

This example is implemented with TDD.

- Storage behavior is tested.
- Each tool's behavior is tested.
- The tool registry is tested.
- `memory.search` matching behavior is tested.
- Safety policy language is tested.
- The agent loop is tested without calling a real LLM.

## Usage

From the repository root:

```bash
npm -w @aituber-onair/chat run build
npm -w @aituber-onair/chat run example:character-agent
```

Or from this example directory:

```bash
npm run build
OPENAI_API_KEY="your-openai-key" npm run start
```

Optional environment variables:

- `CHAT_PROVIDER`: Chat provider name. Defaults to `openai`.
- `CHAT_MODEL`: Provider model name.

Type `exit` or `quit` to end the CLI session.

## Example Conversation

User:
今日の配信で出たアイデアを整理して。あと次回やることもToDoにして。

Assistant:
もちろんです。今日の配信で出たアイデアを整理して、次回までのToDoも作成しますね。

Tool calls:
`memo.save`
`todo.create`
`draft.create`

Assistant:
メモとToDoに整理しました。次回配信用の告知文の下書きも作っておきました。内容を確認して、必要なら一緒に調整しましょう。

## Development Notes

This sample is intentionally small and easy to extend. Future expansions could include:

- Google Calendar integration
- Notion integration
- Discord integration
- YouTube comment integration
- MCP integration
- Long-term memory backed by a vector database
- Voice playback and AITuber UI integration

## TypeScript Notes

- The implementation is TypeScript.
- Inputs and results are explicitly typed.
- Tool storage is injected for tests.
- Test storage uses temporary directories and does not modify the real `data` directory.
- External services are not called by tests.
