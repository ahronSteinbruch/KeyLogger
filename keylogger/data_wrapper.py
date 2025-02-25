import time


class DataWrapper:
    def __init__(self, data, machine_id=""):
        self.data = data
        self.timestamp = time.time()
        self.machine_id = machine_id

    def format_as_dict(self):
        return {
            "machine_id": self.machine_id,
            "data": self.data,
            "timestamp": self.timestamp,
        }
