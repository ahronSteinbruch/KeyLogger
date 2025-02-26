import logging
import time
from flask import Flask, redirect, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
from db import DatabaseHandler
import jwt
from functools import wraps
import os
from random import choice
import string

app = Flask(__name__, static_url_path="", static_folder="static")
cors = CORS(app)

# Secret key for JWT from env, fallback to random string
SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY", "".join([choice(string.ascii_letters) for _ in range(20)])
)


# Initialize Database Handler
db_handler = DatabaseHandler("data.db")

logger = logging.getLogger(__name__)

LONG_POLLING_TIMEOUT = 30


# Middleware to validate JWT tokens
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Check if the Authorization header is present
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"error": "Token is missing!"}), 401

        try:
            # Decode and verify the token
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user_id = payload.get("user_id")  # Attach user ID to the request
            request.is_admin = payload.get("is_admin", False)  # Attach admin status
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token!"}), 401

        return f(*args, **kwargs)

    return decorated


# POST endpoint to receive data
@app.route("/api/data", methods=["POST"])
def receive_data():
    try:
        # Check if the request contains JSON
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        # Parse the JSON data
        data = request.json
        logger.debug(f"Received data: {data}")
        machine_id = data.get("machine_id")
        raw_data = data.get("data", [])
        timestamp = data.get("timestamp")

        # Validate fields
        if not all([machine_id, raw_data, timestamp]):
            return jsonify({"error": "Missing required fields"}), 400

        # Insert data into the database
        success = db_handler.insert_data(
            machine_id,
            raw_data,
            timestamp,
            data.get("active_window"),
            data.get("start_time"),
            data.get("end_time"),
        )
        if success:
            return jsonify({"message": "Data saved successfully"}), 201
        else:
            return jsonify({"error": "Failed to save data"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# GET endpoint to retrieve the last 30 days of data
@app.route("/api/data", methods=["GET"])
@token_required
def get_last_30_days():
    try:
        data = db_handler.get_last_30_days()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# GET endpoint to retrieve data for a specific machine
@app.route("/api/data/<machine_id>", methods=["GET"])
@token_required
def get_data_by_machine(machine_id):
    try:
        data = db_handler.get_data_by_machine(machine_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# GET endpoint to retrieve data for a specific day
@app.route("/data/day/<day>", methods=["GET"])
@token_required
def get_data_by_day(day):
    try:
        data = db_handler.get_data_by_day(day)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/agents", methods=["GET"])
@token_required
def get_agents():
    try:
        agents = db_handler.get_agents()
        return jsonify(agents), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/login", methods=["POST"])
def login():
    try:
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400
        # Parse the JSON data
        data = request.json
        user_id = data.get("user_id")
        password = data.get("password")

        # Val user_id ate fields
        if not all([user_id, password]):
            return jsonify({"error": "Missing required fields"}), 400
        # Authenticate the user (dummy check for demonstration purposes)
        if db_handler.check_agent_password(user_id, password):
            # Create a JWT token
            token_payload = {
                "user_id": user_id,
                "is_admin": db_handler.check_is_admin(
                    user_id
                ),  # Replace with actual admin check logic
                "exp": (
                    datetime.now() + timedelta(days=1)
                ).timestamp(),  # Correct usage
            }
            token = jwt.encode(token_payload, SECRET_KEY, algorithm="HS256")

            return jsonify({"message": "Login successful", "token": token}), 200
        else:
            return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/machine", methods=["POST"])
def machine():
    try:
        # Check if the request contains JSON
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        # Parse the JSON data
        data = request.json
        machine_id = data.get("machine_id")
        info = data.get("info")
        name = data.get("name")
        db_handler.create_or_update_machine(machine_id, name, info)
        return jsonify({"message": "Machine created successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/machine", methods=["GET"])
def get_all_machines():
    try:
        machines = db_handler.get_machines()
        return jsonify(machines), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/agent", methods=["POST"])
@token_required
def agent():
    try:
        # Check if the request contains JSON
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        # Parse the JSON data
        data = request.json
        id = data.get("id")
        name = data.get("name")
        password = data.get("password")
        db_handler.create_agent(id, name, password)
        return jsonify({"message": "Agent created successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ctrl", methods=["POST"])
@token_required
def post_ctrl():
    try:
        # Check if the request contains JSON
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        # Parse the JSON data
        data = request.json
        machine_id = data.get("machine_id")
        control_status = data.get("ctrl")

        # Validate fields
        if not all([machine_id, control_status]):
            return jsonify({"error": "Missing required fields"}), 400

        # Update the control status in the database
        success = db_handler.toggle_tracking(machine_id, control_status)
        if success:
            return jsonify({"message": "Control status updated successfully"}), 200
        else:
            return jsonify({"error": "Failed to update control status"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ctrl", methods=["GET"])
def get_ctrl():
    last = request.args.get("last")
    machine_id = request.args.get("machine_id")
    from_api = request.args.get("from_api")

    if not machine_id:
        return jsonify({"error": "Missing required fields"}), 400

    if from_api:
        # Just return the current status
        return (
            jsonify({"ctrl": db_handler.get_machine_tracking_status(machine_id)}),
            200,
        )

    logger.debug(f"Received control request for machine {machine_id}, last: {last}")
    if last not in ["stop", "start"]:
        # Alweys return start
        return jsonify({"ctrl": "start"}), 200

    # Long-polling to check for control command
    max_wait = datetime.now() + timedelta(seconds=LONG_POLLING_TIMEOUT)
    while max_wait > datetime.now():
        ctrl = db_handler.get_machine_tracking_status(machine_id)
        if ctrl != last and ctrl:
            return jsonify({"ctrl": ctrl}), 200

        db_handler.update_last_seen(machine_id)
        db_handler.toggle_tracking(machine_id, last)
        time.sleep(1)

    return jsonify({"ctrl": last}), 200


@app.route("/", methods=["GET"])
def index():
    return redirect("/login")


@app.route("/login", methods=["GET"])
def login_page():
    return app.send_static_file("login.html")


@app.route("/dashboard", methods=["GET"])
def dashboard_page():
    return app.send_static_file("dashboard.html")


@app.route("/users", methods=["GET"])
def users_page():
    return app.send_static_file("users.html")


@app.route("/machines", methods=["GET"])
def machines_page():
    return app.send_static_file("machines.html")


@app.route("/logs", methods=["GET"])
def data_page():
    return app.send_static_file("data.html")


@app.route("/js/<path:path>")
def send_js(path):
    return app.send_static_file("js/" + path)


@app.route("/css/<path:path>")
def send_css(path):
    return app.send_static_file("css/" + path)


@app.route("/download/<os_name>", methods=["GET"])
def download_agent(os_name):
    if url := os.getenv(f"AGENT_DOWNLOAD_URL{os_name.upper()}"):
        return redirect(url)

    return jsonify({"error": "Download URL not found"}), 404


# Run the Flask app
if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    app.run(debug=True, host="0.0.0.0")
