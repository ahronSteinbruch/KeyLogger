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
            "timestamp": self.end_time.timestamp() if self.end_time else 0,
            "active_window": self.active_window,
            "start_time": (
                self.start_time.strftime("%Y-%m-%d %H:%M:%S") if self.start_time else ""
            ),
            "end_time": (
                self.end_time.strftime("%Y-%m-%d %H:%M:%S") if self.end_time else ""
            ),
            "encrypted": self.encrypted,
        }
