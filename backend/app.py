from flask import Flask, request, jsonify
import sqlite3
from datetime import datetime, timedelta

app = Flask(__name__)

# Initialize SQLite Database
def init_db():
    conn = sqlite3.connect('data.db')
    cursor = conn.cursor()

    # Create Agents Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            access_level INTEGER NOT NULL
        )
    ''')

    # Create Data Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT NOT NULL,
            data TEXT NOT NULL,
            timestamp REAL NOT NULL,
            day DATE NOT NULL,
            hour INTEGER NOT NULL
        )
    ''')

    conn.commit()
    conn.close()

# Helper function to parse timestamp into day and hour
def parse_timestamp(timestamp):
    dt = datetime.fromtimestamp(timestamp)
    day = dt.strftime('%Y-%m-%d')
    hour = dt.hour
    return day, hour

# POST endpoint to receive data
@app.route('/data', methods=['POST'])
def receive_data():
    try:
        data = request.json
        machine_id = data.get('machine_id')
        raw_data = data.get('data')
        timestamp = data.get('timestamp')

        if not all([machine_id, raw_data, timestamp]):
            return jsonify({"error": "Missing required fields"}), 400

        # Parse timestamp
        day, hour = parse_timestamp(timestamp)

        # Save to database
        conn = sqlite3.connect('data.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO data (machine_id, data, timestamp, day, hour)
            VALUES (?, ?, ?, ?, ?)
        ''', (machine_id, raw_data, timestamp, day, hour))
        conn.commit()
        conn.close()

        return jsonify({"message": "Data saved successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# GET endpoint to retrieve the last 30 days of data
@app.route('/data', methods=['GET'])
def get_last_30_days():
    try:
        conn = sqlite3.connect('data.db')
        cursor = conn.cursor()

        # Calculate date 30 days ago
        thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

        cursor.execute('''
            SELECT * FROM data WHERE day >= ?
        ''', (thirty_days_ago,))
        rows = cursor.fetchall()

        # Format response
        result = []
        for row in rows:
            result.append({
                "id": row[0],
                "machine_id": row[1],
                "data": row[2],
                "timestamp": row[3],
                "day": row[4],
                "hour": row[5]
            })

        conn.close()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# GET endpoint to retrieve data for a specific machine
@app.route('/data/<machine_id>', methods=['GET'])
def get_data_by_machine(machine_id):
    try:
        conn = sqlite3.connect('data.db')
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM data WHERE machine_id = ?
        ''', (machine_id,))
        rows = cursor.fetchall()

        # Format response
        result = []
        for row in rows:
            result.append({
                "id": row[0],
                "machine_id": row[1],
                "data": row[2],
                "timestamp": row[3],
                "day": row[4],
                "hour": row[5]
            })

        conn.close()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# GET endpoint to retrieve data for a specific day
@app.route('/data/day/<day>', methods=['GET'])
def get_data_by_day(day):
    try:
        conn = sqlite3.connect('data.db')
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM data WHERE day = ?
        ''', (day,))
        rows = cursor.fetchall()

        # Format response
        result = []
        for row in rows:
            result.append({
                "id": row[0],
                "machine_id": row[1],
                "data": row[2],
                "timestamp": row[3],
                "day": row[4],
                "hour": row[5]
            })

        conn.close()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Run the Flask app
if __name__ == '__main__':
    init_db()
    app.run(debug=True)
