# create-aituber-onair

![create-aituber-onair logo](./images/create-aituber-onair.png)

公式スターターテンプレートから AITuber OnAir アプリを作成する CLI です。

```bash
npm create aituber-onair@latest
```

CLI がプロジェクト名、テンプレート、依存関係をインストールするかどうかを
対話形式で確認します。

プロジェクト名を先に指定することもできます。

```bash
npm create aituber-onair@latest my-aituber
cd my-aituber
npm run dev
```

## テンプレート

- `pngtuber`: PNG アバター画像アセット同梱の 2D PNGTuber アプリ
- `vrm`: `miko.vrm` と待機アニメーション同梱の 3D VRM アプリ

## 使い方

対話型セットアップ:

```bash
npm create aituber-onair@latest
```

プロジェクト名を指定:

```bash
npm create aituber-onair@latest my-aituber
```

テンプレートを明示指定する場合:

```bash
npm create aituber-onair@latest my-aituber -- --template pngtuber
npm create aituber-onair@latest my-vrm-aituber -- --template vrm
```

作成時に依存関係もインストールする場合:

```bash
npm create aituber-onair@latest my-aituber -- --template pngtuber --install
```

インストール確認を省略する場合:

```bash
npm create aituber-onair@latest my-aituber -- --no-install
```

起動後はアプリ内の Settings を開き、LLM / TTS プロバイダーの API キーを
設定してください。生成されたアプリはサンプル用の認証情報をブラウザの
`localStorage` に保存します。共有環境や公開 origin では、本番権限のキーを
使わないでください。
