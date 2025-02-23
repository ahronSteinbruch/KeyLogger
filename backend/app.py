from flask import Flask, request, jsonify
import sqlite3
from datetime import datetime, timedelta
from db import DatabaseHandler
app = Flask(__name__)
# Initialize Database Handler

db_handler = DatabaseHandler()

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

# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True)

# app = Flask(__name__)
#
# # Initialize SQLite Database
#
# # Helper function to parse timestamp into day and hour
# def parse_timestamp(timestamp):
#     dt = datetime.fromtimestamp(timestamp)
#     day = dt.strftime('%Y-%m-%d')
#     hour = dt.hour
#     return day, hour
#
#
# import json
#
# @app.route('/data', methods=['POST'])
# def receive_data():
#     print('hi')  # Debugging line
#     try:
#         # Check if the request contains JSON
#         if not request.is_json:
#             return jsonify({"error": "Request must be JSON"}), 400
#
#         # Parse the JSON data
#         data = request.json
#         print(f"Received data: {data}")  # Debugging line
#
#         # Extract fields
#         machine_id = data.get('machine_id')
#         raw_data = data.get('data')
#         timestamp = data.get('timestamp')
#
#         # Validate fields
#         if not all([machine_id, raw_data, timestamp]):
#             return jsonify({"error": "Missing required fields"}), 400
#
#         # Serialize the data field to a JSON string
#         serialized_data = json.dumps(raw_data)
#         print(f"Serialized data: {serialized_data}")  # Debugging line
#
#         # Parse timestamp
#         day, hour = parse_timestamp(timestamp)
#         print(f"Parsed timestamp - Day: {day}, Hour: {hour}")  # Debugging line
#
#         # Save to database
#         conn = sqlite3.connect('data.db')
#         cursor = conn.cursor()
#         cursor.execute('''
#             INSERT INTO data (machine_id, data, timestamp, day, hour)
#             VALUES (?, ?, ?, ?, ?)
#         ''', (machine_id, serialized_data, timestamp, day, hour))
#         conn.commit()
#         conn.close()
#
#         return jsonify({"message": "Data saved successfully"}), 201
#     except Exception as e:
#         print(f"Exception occurred: {e}")  # Debugging line
#         return jsonify({"error": str(e)}), 500
#
# # GET endpoint to retrieve the last 30 days of data
# @app.route('/data', methods=['GET'])
# def get_last_30_days():
#     try:
#         conn = sqlite3.connect('data.db')
#         cursor = conn.cursor()
#
#         # Calculate date 30 days ago
#         thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
#
#         cursor.execute('''
#             SELECT * FROM data WHERE day >= ?
#         ''', (thirty_days_ago,))
#         rows = cursor.fetchall()
#
#         # Format response
#         result = []
#         for row in rows:
#             deserialized_data = json.loads(row[2])  # Deserialize the data field
#             result.append({
#                 "id": row[0],
#                 "machine_id": row[1],
#                 "data": deserialized_data,
#                 "timestamp": row[3],
#                 "day": row[4],
#                 "hour": row[5]
#             })
#
#         conn.close()
#         return jsonify(result), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
# # GET endpoint to retrieve data for a specific machine
# @app.route('/data/<machine_id>', methods=['GET'])
# def get_data_by_machine(machine_id):
#     try:
#         conn = sqlite3.connect('data.db')
#         cursor = conn.cursor()
#
#         cursor.execute('''
#             SELECT * FROM data WHERE machine_id = ?
#         ''', (machine_id,))
#         rows = cursor.fetchall()
#
#         # Format response
#         result = []
#         for row in rows:
#             result.append({
#                 "id": row[0],
#                 "machine_id": row[1],
#                 "data": row[2],
#                 "timestamp": row[3],
#                 "day": row[4],
#                 "hour": row[5]
#             })
#
#         conn.close()
#         return jsonify(result), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
#
# # GET endpoint to retrieve data for a specific day
# @app.route('/data/day/<day>', methods=['GET'])
# def get_data_by_day(day):
#     try:
#         conn = sqlite3.connect('data.db')
#         cursor = conn.cursor()
#
#         cursor.execute('''
#             SELECT * FROM data WHERE day = ?
#         ''', (day,))
#         rows = cursor.fetchall()
#
#         # Format response
#         result = []
#         for row in rows:
#             result.append({
#                 "id": row[0],
#                 "machine_id": row[1],
#                 "data": row[2],
#                 "timestamp": row[3],
#                 "day": row[4],
#                 "hour": row[5]
#             })
#
#         conn.close()
#         return jsonify(result), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
#
# # Run the Flask app
# if __name__ == '__main__':
#     app.run(debug=True)
