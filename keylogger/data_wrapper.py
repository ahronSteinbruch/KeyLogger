class DataWrapper:
    def __init__(
        self, data, machine_id="", start_time=None, end_time=None, active_window=None
    ):
        self.data = data
        self.machine_id = machine_id
        self.start_time = start_time
        self.end_time = end_time
        self.active_window = active_window
        self.encrypted = ""

    def format_as_dict(self):
        return {
            "data": self.data,
            "machine_id": self.machine_id,
            "timestamp": self.end_time,
            "active_window": self.active,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "encryptde": self.encrypted,
        }
