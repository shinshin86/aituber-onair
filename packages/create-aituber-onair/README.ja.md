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
- `live2d`: Live2D モデルアセットを同梱しない Live2D アプリ
- `pet`: Miko ペットアセット同梱のアニメーション Pet アプリ
- `purupuru`: アバター同梱の物理演算対応ぷるぷる PNGTuber アプリ
- `psd`: motion / static サンプル PSD 同梱の PSD 立ち絵アプリ
- `inochi2d`: Aka サンプルモデルを任意取得できる Inochi2D アプリ

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
npm create aituber-onair@latest my-live2d-aituber -- --template live2d
npm create aituber-onair@latest my-pet-aituber -- --template pet
npm create aituber-onair@latest my-purupuru -- --template purupuru
npm create aituber-onair@latest my-psd-aituber -- --template psd
npm create aituber-onair@latest my-inochi2d-aituber -- --template inochi2d
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

`live2d` テンプレートには、Live2D モデルファイルと
`public/scripts/live2dcubismcore.min.js` は同梱していません。プロジェクト
作成後、生成されたアプリの README に従って利用者自身で配置してください。

`inochi2d` テンプレートの大きな Aka モデルファイルは npm パッケージに
同梱しません。対話セットアップでは、コミット固定 URL からダウンロードするかを
確認し、取得後に SHA-256 を検証します。取得しない場合は
`--no-download-assets` を指定してください。生成後に
`npm run setup:sample-model` で取得することもできます。ランタイムと必要な
第三者ライセンス表記はテンプレートに同梱します。

## テンプレートのメンテナンス

Git 管理されている Core React examplesをテンプレートアプリコードの唯一の原本と
します。`npm run generate:templates` は Git 追跡ファイルだけをコピーし、
ワークスペース依存を公開バージョンへ変換し、npm pack で安全に扱えるよう
`.gitignore` を `_gitignore` へ変更して、テンプレート別のアセットポリシーを
適用します。生成した `templates/` は Git 管理せず、npm パッケージには含めます。

Core exampleまたはテンプレートポリシーを変更した後は、以下を実行してください。

```bash
npm run generate:templates
npm run verify:templates
npm test
npm pack --dry-run
```
