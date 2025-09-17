# IFC Graph Viewer

Graph visualization app for IFC files

![app](images/viewer.jpg)

## Installation

This project is built with Python FastAPI for the backend and Vite+Vue+TS for the frontend, so you need to set up both Python and Node.js environments.

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

## How to Run

### Method 1

Start the backend with Python.

```sh
uv run uvicorn fastapi_server:app --reload
```

Start the frontend with Node.js.

```sh
npm run dev
```

With both services running, access "localhost:5173" in your browser.

### Method 2: Build

Build the frontend.

```sh
npm run build
```

Move the created "nodejs/dist" to "python/dist" and start the backend with Python.

```sh
uv run uvicorn fastapi_server:app --reload
```

With Python running, access "localhost:8000" in your browser.

### Method 3: Use exe from Releases

Extract the zip file uploaded to [Releases](https://github.com/kiyuka829/ifc-graph-viewer/releases) and
run `ifc-graph-viewer.exe`.

## Creating exe

After setting up the environment as described in [Method 2: Build](#method-2-build), run the following command:

```sh
uv run nuitka --standalone --follow-imports app.py --output-dir=../dist --include-data-dir=dist=dist --output-filename=ifc-graph-viewer
```

## Basic Usage Guide

- Drag and drop IFC files onto the screen
  - Supported file formats are `.ifc` and `.ifcx (ifcx_alpha)` only
  - `.ifcx` supports simultaneous dropping of multiple files
- Select a node to display its information on the right side of the screen
- Shift+drag to select multiple nodes
- Drag the yellow circle on a node to expand connected nodes
- Select a node and press the Delete key to remove the node
- Right-click to display the search window
  - Select an ID in the search window to display a node at the right-clicked location
- Use the mouse wheel to zoom in and out of the display
