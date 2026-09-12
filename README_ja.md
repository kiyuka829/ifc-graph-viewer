# IFC Graph Viewer

IFC ファイルのグラフ可視化アプリ。ブラウザ版は [こちら](https://kiyuka829.github.io/ifc-graph-viewer/) から実行できる。

![app](images/viewer.jpg)

## インストール

バックエンドは Python の FastAPI、フロントエンドは Vite + Vue + TS で構築している。

### Python

```sh
cd python
uv sync
```

### Node.js

```sh
cd nodejs
npm install
```

## 実行方法

### 方法 1：開発環境で実行する

Python でバックエンドを起動する。

```sh
uv run uvicorn fastapi_server:app --reload
```

Node.js でフロントエンドを起動する。

```sh
npm run dev:python
```

両方を起動した状態で、ブラウザから `http://localhost:5173` にアクセスする。

### 方法 2：ビルドして実行する

フロントエンドをビルドする。

```sh
npm run build:python
```

作成された `nodejs/dist` を `python/dist` に移動し、Python でバックエンドを起動する。

```sh
uv run uvicorn fastapi_server:app --reload
```

Python を起動した状態で、ブラウザから `http://localhost:8000` にアクセスする。

### 方法 3：Python を使用せずに実行する

Python を使用せず、ブラウザ内のみで実行する。

```sh
cd nodejs
npm run dev:browser
```

ブラウザから `http://localhost:5173` にアクセスする。

ビルドする場合は以下を実行する。

```sh
cd nodejs
npm run build:browser
npm run preview -- --mode browser
```

ブラウザから `http://localhost:4173` にアクセスする。

### 方法 4：Releases の exe を使う

[Releases](https://github.com/kiyuka829/ifc-graph-viewer/releases) にアップロードしている zip を解凍し、`ifc-graph-viewer.exe` を実行する。

## exe 化

[方法 2：ビルドして実行する](#方法-2ビルドして実行する) の状態にしてから、以下のコマンドを実行する。

```sh
uv run nuitka app.py --standalone --follow-imports --windows-console-mode=disable --output-dir=../dist --include-data-dir=dist=dist --output-filename=ifc-graph-viewer
```

## 使い方簡易説明

- IFC ファイルを画面にドラッグ&ドロップする
  - 対応ファイル形式は `.ifc`, `.ifcx (ifcx_alpha)` のみ
  - `.ifcx` は複数ファイルの同時ドロップに対応
- ノードを選択すると、画面右側にノードの情報が表示される
- Shift + ドラッグでノードを複数選択できる
- ノードの丸をドラッグすると、接続先のノードが展開される
- ノードを選択した状態で Delete キーを押すと、ノードが削除される
- ヘッダー中央の Search ボタンから検索ウィンドウを開ける
  - 検索結果の ID を選択すると、キャンバス左上付近にノードが表示される
- マウスホイールで表示を拡大・縮小できる
- ヘッダー右上のズーム操作で、拡大・縮小・リセット・全体表示（Fit）ができる
