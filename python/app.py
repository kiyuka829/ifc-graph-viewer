import threading
import socket
import uvicorn
import webview

from fastapi_server import app as server


def find_free_port():
    s = socket.socket()
    s.bind(("", 0))  # OSに空いてるポートを選ばせる
    port = s.getsockname()[1]
    s.close()
    return port


def start_api(port):
    uvicorn.run(server, host="127.0.0.1", port=port, use_colors=False)


if __name__ == "__main__":
    port = find_free_port()
    threading.Thread(target=start_api, args=(port,), daemon=True).start()
    webview.create_window(
        "IFC Graph Viewer",
        f"http://127.0.0.1:{port}",
        maximized=True,
        confirm_close=True,
    )
    webview.start(debug=False)
