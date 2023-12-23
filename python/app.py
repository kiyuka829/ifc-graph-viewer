import webview

from server import app as server

if __name__ == "__main__":
    webview.create_window(
        "IFC Graph Viewer",
        server,
        maximized=True,
        confirm_close=True,
    )
    webview.start()
