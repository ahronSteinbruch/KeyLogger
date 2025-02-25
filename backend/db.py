import hashlib
import sqlite3
from datetime import datetime, timedelta
import json
from typing import Literal


TRACKING_MAP = ["exit", "start", "stop"]


# Database Handler Class
class DatabaseHandler:
    def __init__(self, db_name):
        self.db_name = db_name
        self.init_db()

    def init_db(self):
        """Initialize the database and create tables if they don't exist."""
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()

        # Create Data Table
        cursor.executescript(
            """
            CREATE TABLE IF NOT EXISTS data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_id TEXT NOT NULL,
                data TEXT NOT NULL,
                timestamp REAL NOT NULL,
                day DATE NOT NULL,
                hour INTEGER NOT NULL
            );
                       
            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                hash TEXT NOT NULL
            );
                       
            CREATE TABLE IF NOT EXISTS machines (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                tracking INTEGER NOT NULL,
                info TEXT,
                last_seen REAL NOT NULL
            );
        """
        )

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
            cursor.execute(
                """
                INSERT INTO data (machine_id, data, timestamp, day, hour)
                VALUES (?, ?, ?, ?, ?)
            """,
                (machine_id, serialized_data, timestamp, day, hour),
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error inserting data: {e}")
            return False

    def get_last_30_days(self):
        """Retrieve data from the last 30 days."""
        try:
            thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
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
            cursor.execute(
                f"""
                SELECT * FROM data {condition}
            """,
                params,
            )
            rows = cursor.fetchall()
            conn.close()

            # Format response
            result = []
            for row in rows:
                deserialized_data = json.loads(row[2])  # Deserialize the data field
                result.append(
                    {
                        "machine_id": row[1],
                        "data": deserialized_data,
                        "timestamp": float(row[3]) if row[3] else None,
                        "day": row[4],
                        "hour": row[5],
                    }
                )
            return result
        except Exception as e:
            print(f"Error querying data: {e}")
            return []

    def check_agent_password(self, id, password) -> bool:
        """Check if the agent password is correct."""

        try:
            # hash the password
            hash = hashlib.sha256(password.encode()).hexdigest()

            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM agents WHERE id = ? AND hash = ?
            """,
                (id, hash),
            )
            row = cursor.fetchone()
            conn.close()

            return row is not None
        except Exception as e:
            print(f"Error checking agent password: {e}")
            return False

    def create_agent(self, id, name, password) -> bool:
        """Create a new agent in the database."""

        try:
            # hash the password
            hash = hashlib.sha256(password.encode()).hexdigest()

            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO agents (id, name, hash)
                VALUES (?, ?, ?)
            """,
                (id, name, hash),
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error creating agent: {e}")
            return False

    def get_machines(self):
        """Retrieve all machines from the database."""

        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM machines
            """
            )
            rows = cursor.fetchall()
            conn.close()

            # Format response
            result = []
            for row in rows:
                result.append(
                    {
                        "id": row[0],
                        "name": row[1],
                        "tracking": row[2],
                        "info": row[3],
                        "last_seen": row[4],
                    }
                )
            return result
        except Exception as e:
            print(f"Error retrieving machines: {e}")
            return []

    def create_or_update_machine(self, machine_id, name, info):
        """Create or update a machine in the database."""
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO machines (id, name, info, last_seen)
                VALUES (?, ?, ?, ?, ?)
            """,
                (machine_id, name, info, datetime.now().timestamp()),
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error creating or updating machine: {e}")
            return False

    def toggle_tracking(self, machine_id, tracking: Literal["exit", "start", "stop"]):
        """Toggle tracking for a machine."""
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE machines SET tracking = ? WHERE id = ?
            """,
                (tracking, machine_id),
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error toggling tracking: {e}")
            return False

    def get_machine_tracking_status(
        self, machine_id
    ) -> Literal["exit", "start", "stop"]:
        """Get the tracking status for a machine."""
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT tracking FROM machines WHERE id = ?
            """,
                (machine_id,),
            )
            row = cursor.fetchone()
            conn.close()
            return TRACKING_MAP[row[0]] if row else "exit"
        except Exception as e:
            print(f"Error getting tracking status: {e}")
            return "exit"

    def update_last_seen(self, machine_id):
        """Update the last seen timestamp for a machine."""
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE machines SET last_seen = ? WHERE id = ?
            """,
                (datetime.now().timestamp(), machine_id),
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error updating last seen: {e}")
            return False

    @staticmethod
    def parse_timestamp(timestamp):
        """Parse a Unix timestamp into day and hour."""
        dt = datetime.fromtimestamp(timestamp)
        day = dt.strftime("%Y-%m-%d")
        hour = dt.hour
        return day, hour

    def get_agents(self):
        """Retrieve all agents from the database."""

        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM agents
            """
            )
            rows = cursor.fetchall()
            conn.close()

            # Format response
            result = []
            for row in rows:
                result.append(
                    {
                        "id": row[0],
                        "name": row[1],
                    }
                )
            return result
        except Exception as e:
            print(f"Error retrieving agents: {e}")
            return json.dumps({
                "error": "Error retrieving agents"
            })
