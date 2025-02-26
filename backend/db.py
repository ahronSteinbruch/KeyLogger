import hashlib
import logging
import sqlite3
from datetime import datetime, timedelta
import json
from typing import Literal

logger = logging.getLogger(__name__)

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
                active_window TEXT,
                start_time REAL,
                end_time REAL,
                timestamp REAL NOT NULL,
                day DATE NOT NULL,
                hour INTEGER NOT NULL
            );
                       
            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                is_admin INTEGER NOT NULL DEFAULT 0,
                name TEXT NOT NULL,
                hash TEXT NOT NULL
            );
                       
            CREATE TABLE IF NOT EXISTS machines (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                tracking INTEGER NOT NULL DEFAULT -1,
                info TEXT,
                last_seen REAL NOT NULL
            );
        """
        )

        conn.commit()
        conn.close()

    def insert_data(
        self, machine_id, raw_data, timestamp, active_window, start_time, end_time
    ):
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
                INSERT INTO data (machine_id, data, timestamp, day, hour, active_window, start_time, end_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    machine_id,
                    serialized_data,
                    timestamp,
                    day,
                    hour,
                    active_window,
                    start_time,
                    end_time,
                ),
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
                SELECT id, data, timestamp, active_window, start_time, end_time, machine_id
                FROM data {condition}
            """,
                params,
            )
            rows = cursor.fetchall()
            conn.close()

            # Format response
            result = []
            for row in rows:
                # Deserialize the data field
                deserialized_data = json.loads(row[1])
                result.append(
                    {
                        "id": row[0],
                        "data": deserialized_data,
                        "timestamp": row[2],
                        "active_window": row[3],
                        "start_time": row[4],
                        "end_time": row[5],
                        "machine_id": row[6],
                    }
                )
            return result
        except Exception as e:
            logger.error(f"Error querying data: {e}")
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

    def check_is_admin(self, id) -> bool:
        """Check if the agent is an admin."""

        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT is_admin FROM agents WHERE id = ?
            """,
                (id,),
            )
            row = cursor.fetchone()
            conn.close()

            return row[0] == 1
        except Exception as e:
            print(f"Error checking agent is admin: {e}")
            return False

    def create_or_update_agent(self, id, name, password, admin: bool = False) -> bool:
        """Create a new agent in the database."""

        try:
            # hash the password
            hash = hashlib.sha256(password.encode()).hexdigest()

            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO agents (id, name, hash, is_admin)
                VALUES (?, ?, ?, ?)
                """,
                (id, name, hash, 1 if admin else 0),
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
                        "info": json.loads(row[3]) if row[3] else {},
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
                VALUES (?, ?, ?, ?)
                """,
                (
                    machine_id,
                    name,
                    json.dumps(info, ensure_ascii=False),
                    datetime.now().timestamp(),
                ),
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
            tracking = TRACKING_MAP.index(tracking)
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
    ) -> Literal["exit", "start", "stop", ""]:
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
            return TRACKING_MAP[row[0]] if row and row[0] >= 0 else ""
        except Exception as e:
            print(f"Error getting tracking status: {e}")
            return ""

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
            return json.dumps({"error": "Error retrieving agents"})


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 4:
        print("Usage: python db.py <db_path> <username> <password>")
        sys.exit(1)

    username, password = sys.argv[2], sys.argv[3]
    db_handler = DatabaseHandler(sys.argv[1])
    db_handler.create_or_update_agent(username, username, password, admin=True)
    print(f"Agent {username} created successfully.")
