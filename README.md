# IFC Graph Viewer

Graph visualization app for IFC files

![app](images/viewer.jpg)

## Installation

The backend uses Python FastAPI, and the frontend uses Vite+Vue+TS.
Both Python and Node.js are required to view IFC files.
IFCX files are processed entirely in the browser, so you do not need to install or run Python if you only view IFCX files.

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
uv run nuitka app.py --standalone --follow-imports --windows-console-mode=disable --output-dir=../dist --include-data-dir=dist=dist --output-filename=ifc-graph-viewer
```

## Basic Usage Guide

- Drag and drop IFC files onto the screen
  - Supported file formats are `.ifc` and `.ifcx (ifcx_alpha)` only
  - `.ifcx` supports simultaneous dropping of multiple files
- Select a node to display its information on the right side of the screen
- Shift+drag to select multiple nodes
- Drag the circle on a node to expand connected nodes
- Select a node and press the Delete key to remove the node
- Open the search window from the Search button in the center of the header
  - Select an ID in the search window to display a node near the top-left area of the canvas
- Use the mouse wheel to zoom in and out of the display
- Use the zoom controls in the top-right of the header for zoom in/out, reset, and fit-to-screen

## Previewing the Pages Build

```sh
cd nodejs
npm run build:pages
npm run preview -- --mode pages
```

Open `http://localhost:4173/ifc-graph-viewer/` in your browser.
Pages mode supports IFCX only.
