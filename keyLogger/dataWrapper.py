import time

class DataWrapper:
    def __init__(self, data):
        self.data = data
        self.timestamp = time.time()

    def __str__(self):
        return f"{self.timestamp}: {self.data}"
    def format_as_dict(self):
        return {self.timestamp: self.data}
