import os
import json


def write_to_file(self):
        """
        Write the collected data to a log file.
        """
        if os.path.exists(self.log_file):
            with open(self.log_file, 'r') as file:
                try:
                    existing_log = json.load(file)
                except json.JSONDecodeError:
                    existing_log = []
        else:
            existing_log = []

        existing_log.extend(self.buffer)
        with open(self.log_file, 'w') as file:
            json.dump(existing_log, file, indent=4)

        self.buffer = []