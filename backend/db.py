import sqlite3
from datetime import datetime, timedelta
import json

# Database Handler Class
class DatabaseHandler:
    def __init__(self, db_name='data.db'):
        self.db_name = db_name
        self.init_db()

    def init_db(self):
        """Initialize the database and create tables if they don't exist."""
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()

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

    def insert_data(self, machine_id, raw_data, timestamp):
        """Insert data into the database."""
        try:
            # Parse timestamp
            day, hour = self.parse_timestamp(timestamp)

            # Serialize the data field
            serialized_data = json.dumps(raw_data)

            # Save to database
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO data (machine_id, data, timestamp, day, hour)
                VALUES (?, ?, ?, ?, ?)
            ''', (machine_id, serialized_data, timestamp, day, hour))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error inserting data: {e}")
            return False

    def get_last_30_days(self):
        """Retrieve data from the last 30 days."""
        try:
            thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            return self.query_data("WHERE day >= ?", (thirty_days_ago,))
        except Exception as e:
            print(f"Error retrieving last 30 days: {e}")
            return []

    def get_data_by_machine(self, machine_id):
        """Retrieve data for a specific machine."""
        try:
            return self.query_data("WHERE machine_id = ?", (machine_id,))
        except Exception as e:
            print(f"Error retrieving data by machine: {e}")
            return []

    def get_data_by_day(self, day):
        """Retrieve data for a specific day."""
        try:
            return self.query_data("WHERE day = ?", (day,))
        except Exception as e:
            print(f"Error retrieving data by day: {e}")
            return []

    def query_data(self, condition, params):
        """Generic method to query data from the database."""
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute(f'''
                SELECT * FROM data {condition}
            ''', params)
            rows = cursor.fetchall()
            conn.close()

            # Format response
            result = []
            for row in rows:
                deserialized_data = json.loads(row[2])  # Deserialize the data field
                result.append({
                    "id": row[0],
                    "machine_id": row[1],
                    "data": deserialized_data,
                    "timestamp": row[3],
                    "day": row[4],
                    "hour": row[5]
                })
            return result
        except Exception as e:
            print(f"Error querying data: {e}")
            return []

    @staticmethod
    def parse_timestamp(timestamp):
        """Parse a Unix timestamp into day and hour."""
        dt = datetime.fromtimestamp(timestamp)
        day = dt.strftime('%Y-%m-%d')
        hour = dt.hour
        return day, hour



