import logging
import time
from flask import Flask, request, jsonify
import sqlite3
from datetime import datetime, timedelta
from db import DatabaseHandler

app = Flask(__name__)
# Initialize Database Handler

db_handler = DatabaseHandler()

logger = logging.getLogger(__name__)


# POST endpoint to receive data
@app.route('/data', methods=['POST'])
def receive_data():
    try:
        # Check if the request contains JSON
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        # Parse the JSON data
        data = request.json
        machine_id = data.get('machine_id')
        raw_data = data.get('data')
        timestamp = data.get('timestamp')

        # Validate fields
        if not all([machine_id, raw_data, timestamp]):
            return jsonify({"error": "Missing required fields"}), 400

        # Insert data into the database
        success = db_handler.insert_data(machine_id, raw_data, timestamp)
        if success:
            return jsonify({"message": "Data saved successfully"}), 201
        else:
            return jsonify({"error": "Failed to save data"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# GET endpoint to retrieve the last 30 days of data
@app.route('/data', methods=['GET'])
def get_last_30_days():
    try:
        data = db_handler.get_last_30_days()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# GET endpoint to retrieve data for a specific machine
@app.route('/data/<machine_id>', methods=['GET'])
def get_data_by_machine(machine_id):
    try:
        data = db_handler.get_data_by_machine(machine_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# GET endpoint to retrieve data for a specific day
@app.route('/data/day/<day>', methods=['GET'])
def get_data_by_day(day):
    try:
        data = db_handler.get_data_by_day(day)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route('/', methods=['GET'])
def geter():
    return "hello"

@app.route('/login',methods=['POST'])
def login():    # Login endpoint to authenticate user
    try:
        # Check if the request contains JSON
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        # Parse the JSON data
        data = request.json
        user_id = data.get('user_id')
        password = data.get('password')

        # Val user_id ate fields
        if not all([user_id, password]):
            return jsonify({"error": "Missing required fields"}), 400

        # Dummy check for demonstration purposes
        if user_id == 315591909 and password == "007":
            return jsonify({"message": "Login successful"}), 200
        else:
            return jsonify({"error": "Invaluser_id credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/ctrl", methods=["GET"])
def get_ctrl():
    last = request.args.get("last")
    machine_id = request.args.get("machine_id")

    logger.info(f"Received control request for machine {machine_id}, last: {last}")

    if not machine_id:
        return jsonify({"error": "Missing required fields"}), 400

    if last not in ["stop", "start"]:
        # Alweys return start
        return jsonify({"ctrl": "start"}), 200

    time.sleep(5)
    return jsonify({"ctrl": db_handler.get_machine_tracking_status(machine_id)}), 200


# Run the Flask app
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    app.run(debug=True, host="0.0.0.0")
