from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pathlib import Path

from ifc_utils import get_ifcproject

app = Flask(__name__)
CORS(app)

# ファイルアップロードの設定
UPLOAD_FOLDER = Path("uploads")
ALLOWED_EXTENSIONS = {".ifc"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


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

        print(get_ifcproject(file_path))
        return jsonify({"message": "ファイルがアップロードされました。"}), 200

    return jsonify({"message": "許可されていないファイル形式です。"}), 400


if __name__ == "__main__":
    # フォルダが存在しない場合は作成
    UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
    app.run(debug=True)
