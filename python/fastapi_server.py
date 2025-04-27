from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel

import ifc_utils as ifc

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
ALLOWED_EXTENSIONS = {".ifc"}
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)


class NodeRequest(BaseModel):
    path: str
    id: int


@app.get("/", response_class=HTMLResponse)
async def read_root():
    return FileResponse("dist/index.html")


def allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # ファイルが空でないか、または正しいファイル名を持っているかを確認
    if not file.filename:
        raise HTTPException(status_code=400, detail="ファイル名がありません。")

    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400, detail="許可されていないファイル形式です。"
        )

    filename = Path(file.filename).name
    file_path = UPLOAD_FOLDER / filename

    # ファイルを保存
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # IFCファイルの処理
    try:
        ifcproject = ifc.get_ifcproject(file_path)
        entities = ifc.get_entities(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IFCファイル処理エラー: {str(e)}")

    return {
        "message": "ファイルがアップロードされました。",
        "model": ifcproject,
        "entities": entities,
        "path": file_path.as_posix(),
    }


@app.post("/get_node")
async def get_node(request: NodeRequest):
    try:
        node = ifc.get_by_id(request.path, request.id)
        return {
            "message": "ノード追加に成功しました。",
            "node": node,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"エラー: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
