import logging

from flask import Flask
from flask_cors import CORS

from config.settings import Settings
from core.grading_service import grading_runtime
from routes.api import api_blueprint


logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
)


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/api/sterilizer-ai/*": {"origins": "*"}})
    app.register_blueprint(api_blueprint)
    grading_runtime.start()
    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=Settings.PORT,
        debug=Settings.FLASK_ENV == "development",
        threaded=True,
        use_reloader=False,
    )

