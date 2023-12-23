from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pathlib import Path
import mimetypes

import ifc_utils as ifc

mimetypes.add_type("application/javascript", ".js")
app = Flask(__name__, static_folder="dist", static_url_path="")
CORS(app)

# ファイルアップロードの設定
UPLOAD_FOLDER = Path("uploads")
ALLOWED_EXTENSIONS = {".ifc"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def send_js(path):
    return send_from_directory(app.static_folder, path)


def allowed_file(filename):
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


@app.route("/upload", methods=["POST"])
def upload_file():
    # ファイルがリクエストに含まれているかを確認
    if "file" not in request.files:
        return jsonify({"message": "ファイルがリクエストに含まれていません。"}), 400

    file = request.files["file"]

    # ファイルが空でないか、または正しいファイル名を持っているかを確認
    if file.filename == "":
        return "ファイル名がありません。", 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = UPLOAD_FOLDER / filename
        file.save(file_path)

        app.logger.info("ファイル読み込み開始")
        ifcproject = ifc.get_ifcproject(file_path)
        entityies = ifc.get_entities(file_path)
        app.logger.info("ファイル読み込み完了")
        return (
            jsonify(
                {
                    "message": "ファイルがアップロードされました。",
                    "model": ifcproject,
                    "entities": entityies,
                    "path": file_path.as_posix(),
                }
            ),
            200,
        )

    return jsonify({"message": "許可されていないファイル形式です。"}), 400


@app.route("/get_node", methods=["POST"])
def get_node():
    data = request.get_json()
    print(data)

    node = ifc.get_by_id(data.get("path"), data.get("id"))
    return (
        jsonify(
            {
                "message": "ノード追加に成功しました。",
                "node": node,
            }
        ),
        200,
    )


@app.route("/get_node_by_type", methods=["POST"])
def get_node_by_type():
    data = request.get_json()
    print(data)

    node = ifc.get_by_type(data.get("path"), data.get("type"))
    return (
        jsonify(
            {
                "message": "ノード追加に成功しました。",
                "node": node,
            }
        ),
        200,
    )


if __name__ == "__main__":
    app.run(debug=True)
