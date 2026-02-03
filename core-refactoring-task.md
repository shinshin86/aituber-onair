# core-refactoring-task.md

目的: core パッケージの冗長さを減らし、読みやすさと保守性を上げる。
非ゴール: 不必要な共通化や可読性が落ちるリファクタリング。

## タスクリスト
| ID | 優先度 | 対象 | 提案 | テスト観点 |
| --- | --- | --- | --- | --- |
| core-01 (完了済み) | 中 | `packages/core/src/core/ChatProcessor.ts` | `MAX_HOPS` を readonly + `(this as any)` で更新している箇所を整理。`maxHops` を可変プロパティにするか getter 化して options から参照するように変更。 | 既存の `maxHops` の挙動が維持されるか（更新後に反映されるか）。 |
| core-02 | 中 | `packages/core/src/core/ChatProcessor.ts` | `runToolLoop` の Claude/非Claude 分岐とメッセージ組み立てを小さな private 関数に分割し、`any` キャストを削減。 | tool 連鎖の挙動（tool_use → tool_result → 継続）が既存と同じか。 |
| core-03 | 低 | `packages/core/src/core/AITuberOnAirCore.ts` | Provider の switch を `buildChatServiceOptions(providerName, baseOptions, providerOptions)` のような関数へ抽出して可読性を改善。 | 既存の provider 選択と options のマージ順序が変わらないか。 |
| core-04 | 中 | `packages/core/src/core/AITuberOnAirCore.ts` | `processChat` / `processVisionChat` の重複した排他制御・イベント発火・try/finally を共通化（小さな helper へ）。 | PROCESSING_START/END が同じタイミングで発火するか。 |
| core-05 | 低 | `packages/core/src/core/AITuberOnAirCore.ts` | speech chunking（区切り判定・マージ）を `utils/speechChunking.ts` の純粋関数へ移動し、ユニットテストしやすくする。 | 既存の分割結果（特に minWords と separators）が変わらないか。 |
| core-06 | 中 | `packages/core/src/services/chat/providers/*/*Summarizer.ts` | 3実装の共通処理（prompt 生成、会話結合、fallback）を共有 helper へ抽出。各 provider は request 生成だけを担当。 | 例外時の fallback 文言が維持されるか。 |
| core-07 | 低 | `packages/core/src/core/MemoryManager.ts` | `getMemoryForPrompt` の `[Short/Mid/Long-term memory: Xmin]` が固定値のため、options の duration から生成するよう変更。 | duration を変更したとき表示内容が一致するか。 |
| core-08 | 中 | `packages/core/src/core/MemoryManager.ts` | constructor 内の `loadFromStorage()` を明示的な `initialize()`/`create()` に分離し、非同期初期化のタイミングを明確化。 | 初期化後に `MEMORY_LOADED` が確実に発火するか。 |
| core-09 | 中 | `packages/core/src/services/youtube/YouTubeDataApiService.ts` | `startWatching` と `setFetchInterval` の interval 生成ロジックを共通化し、`liveChatId` をキャッシュして不要な API 呼び出しを減らす。 | 監視再開・fetchInterval 変更時の動作が同じか。 |
| core-10 (完了済み) | 低 | `packages/core/src/core/ToolExecutor.ts` | MCP 名称の解析ロジックを 1 つの関数にまとめ、同じバリデーションを二重に書かない。 | MCP tool 名の形式エラーが同じ条件で発生するか。 |

## 補足
- 影響範囲が大きくなりそうな項目は、まず小さく分割して着手するのがおすすめ。
- 実装前にテストの追加/更新が必要かを軽く確認すると安全。
