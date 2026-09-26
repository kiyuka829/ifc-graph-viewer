import atexit
import os
import shutil
import sys
import tempfile
import traceback
from pathlib import Path
from typing import List, Union

import ifc_accessor as ifc
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://127.0.0.1",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_app_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


APP_ROOT = get_app_root()
DIST_DIR = APP_ROOT / "dist"
app.mount("/dist", StaticFiles(directory=str(DIST_DIR), html=True, check_dir=False))

# ファイルアップロードの設定
UPLOAD_ROOT = Path(tempfile.mkdtemp(prefix="ifc-graph-viewer-"))
UPLOAD_FOLDER = UPLOAD_ROOT / "uploads"
ALLOWED_EXTENSIONS = {".ifc", ".ifcx"}  # NOSONAR
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
atexit.register(lambda: shutil.rmtree(UPLOAD_ROOT, ignore_errors=True))


@app.get("/", response_class=HTMLResponse)
async def read_root():
    return FileResponse(DIST_DIR / "index.html")


def allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def reject_ifcx(path: str | Path | None) -> None:
    if path is not None and Path(path).suffix.lower() == ".ifcx":
        raise HTTPException(
            status_code=501, detail="IFCX is not supported by the Python backend."
        )


@app.post("/upload")
async def upload_file(files: List[UploadFile] = File(...)):
    # ファイルが空でないか、または正しいファイル名を持っているかを確認
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="ファイルがありません。")

    files = [file for file in files if allowed_file(file.filename)]
    if len(files) == 0:
        raise HTTPException(
            status_code=400, detail="許可されていないファイル形式です。"
        )

    for file in files:
        reject_ifcx(file.filename)

    # すべてのファイルを保存
    file_path_list = []
    for file in files:
        filename = Path(file.filename).name
        file_path = UPLOAD_FOLDER / filename
        file_path_list.append(file_path)

        # ファイルを保存
        contents = await file.read()
        Path(file_path).write_bytes(contents)

    # IFCファイルの処理
    try:
        if file_path_list[0].suffix == ".ifc":
            # .ifcは一つのみ処理
            file_path = file_path_list[0]
            root_node = ifc.get_ifc_project(file_path)
            search_data = ifc.get_search_data(file_path)
            header_info = [
                {
                    "filename": file_path.name,
                    "format": "ifc",
                    "header": ifc.get_header_info(file_path),
                }
            ]
            path_str = file_path.as_posix()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"IFCファイル処理エラー: {str(e)}")

    return {
        "message": "ファイルがアップロードされました。",
        "root": root_node,
        "searchData": search_data,
        "headers": header_info,
        "path": path_str,
    }


class SearchDataRequest(BaseModel):
    path: str


@app.post("/search_data")
async def get_search_data(request: SearchDataRequest):
    reject_ifcx(request.path)
    try:
        if request.path.endswith(".ifc"):
            search_data = ifc.get_search_data(request.path)

        return {
            "message": "検索データ取得に成功しました。",
            "searchData": search_data,
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"エラー: {str(e)}")


class NodeRequest(BaseModel):
    path: str
    id: Union[int, str]


@app.post("/get_node")
async def get_node(request: NodeRequest):
    reject_ifcx(request.path)
    try:
        if request.path.endswith(".ifc"):
            node = ifc.get_by_id(request.path, request.id)

        return {
            "message": "ノード追加に成功しました。",
            "node": node,
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"エラー: {str(e)}")


class LookupEntityRequest(BaseModel):
    path: str
    key: str
    value: str


@app.post("/lookup_entity")
async def lookup_entity(request: LookupEntityRequest):
    reject_ifcx(request.path)
    try:
        if request.path.endswith(".ifc"):
            if request.key == "id":
                result = ifc.get_search_item_by_id(request.path, request.value)
            elif request.key == "globalId":
                result = ifc.get_search_item_by_global_id(request.path, request.value)
            else:
                raise HTTPException(status_code=400, detail="keyが不正です。")
        else:
            raise HTTPException(
                status_code=400, detail="IFC/IFCXファイルのみ対応しています。"
            )

        if result is None:
            return {
                "message": "検索結果がありません。",
                "entityType": "",
                "items": [],
            }

        entity_type, item = result
        return {
            "message": "検索に成功しました。",
            "entityType": entity_type,
            "items": [item],
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"エラー: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
