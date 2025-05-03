import traceback
from pathlib import Path
from typing import List, Union

import ifc_accessor as ifc
import ifcx_alpha_accessor as ifcx
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# アプリケーションの初期化
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

app.mount("/dist", StaticFiles(directory="dist", html=True))

# ファイルアップロードの設定
UPLOAD_FOLDER = Path("uploads")
ALLOWED_EXTENSIONS = {".ifc", ".ifcx"}
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)


@app.get("/", response_class=HTMLResponse)
async def read_root():
    return FileResponse("dist/index.html")


def allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


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

    # すべてのファイルを保存
    file_path_list = []
    for file in files:
        filename = Path(file.filename).name
        file_path = UPLOAD_FOLDER / filename
        file_path_list.append(file_path)

        # ファイルを保存
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

    # IFCファイルの処理
    try:
        if file_path_list[0].suffix == ".ifc":
            # .ifcは一つのみ処理
            file_path = file_path_list[0]
            root_node = ifc.get_ifc_project(file_path)
            search_data = ifc.get_search_data(file_path)
            path_str = file_path.as_posix()
        elif file_path_list[0].suffix == ".ifcx":
            ifcx.clear_load_files()

            # .ifcxは複数処理
            path_strs = []
            for file_path in file_path_list:
                if file_path.suffix == ".ifcx":
                    path_strs.append(file_path.name)
                    ifcx.load_model(file_path)
            ifcx.compose()

            root_node = ifcx.get_root_node()
            search_data = ifcx.get_search_data()
            path_str = ", ".join(path_strs)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"IFCファイル処理エラー: {str(e)}")

    return {
        "message": "ファイルがアップロードされました。",
        "root": root_node,
        "searchData": search_data,
        "path": path_str,
    }


class SearchDataRequest(BaseModel):
    path: str


@app.post("/search_data")
async def get_search_data(request: SearchDataRequest):
    try:
        if request.path.endswith(".ifc"):
            search_data = ifc.get_search_data(request.path)
        elif request.path.endswith(".ifcx"):
            search_data = ifcx.get_search_data(request.path)

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
    try:
        if request.path.endswith(".ifc"):
            node = ifc.get_by_id(request.path, request.id)
        elif request.path.endswith(".ifcx"):
            node = ifcx.get_by_id(request.path, request.id)

        return {
            "message": "ノード追加に成功しました。",
            "node": node,
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"エラー: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
