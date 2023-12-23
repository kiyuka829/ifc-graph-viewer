# IFC graph viewer

IFCファイルのグラフ可視化アプリ

## 動作環境

以下で確認

- Windows10
- Google Chrome: 120.0.6099.72
- node:  16.15.0
- npm:  9.7.1
- Python:  3.9.10
- IfcOpenShell: 0.7.0

## インストール

バックエンドをPythonのFlask、フロントエンドをVite+Vue+TSで構築しているので、PythonとNode.jsの両方の環境を作る必要がある。

### Python

```sh
cd python
python -m venv env
env\Scripts\activate.bat
pip install -r requirements.txt
```

`IfcOpenShell`は[公式](https://blenderbim.org/docs-python/ifcopenshell-python/installation.html)から、
Pre-built packagesをダウンロードして`env/Lib/site-packages`に格納する。

### Node.js

```sh
cd nodejs
npm install
```

## 実行方法

### 方法1

Pythonでバックエンド起動する。

```sh
python server.py
```

Node.jsでフロントエンド起動する。

```sh
npm run dev
```

両方を起動した状態で「localhost:5173」にブラウザでアクセスする

### 方法2：ビルド

フロントエンドをビルドする。

```sh
npm run build
```

作成された「nodejs/dist」を「python/dist」に移動し、Pythonでバックエンド起動する。

```sh
python server.py
```

Pythonを動かした状態で「localhost:5000」にブラウザでアクセスする。

## 使い方簡易説明

- 「ファイルの選択」からIFCファイルを選択する
  - 対応しているファイル形式は `.ifc` のみ
- ノードを選択すると画面右にノードの情報が表示される
- ノードの黄色の丸をドラッグすることで、接続先のノードを展開される
- ノードを選択した状態でDeleteキーを押すとノードが削除される
- 右クリックを押すとエンティティの検索ウィンドウが表示される
  - 検索ウィンドウのエンティティIDを選択すると右クリックした場所にノードが表示される
- マウスホイールで表示の拡大縮小ができる

