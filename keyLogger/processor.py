import time
from dataWrapper import DataWrapper


class Process:
    def __init__(self,data):
        self.data = data

    def process_data(self):
        timestamp = time.time()
        data_wrapper = DataWrapper(self.data,timestamp)
        # Do encryption here if needed
        encrypted_data = self.encrypt_data(data_wrapper)
        self.send_to_sink(encrypted_data)

    def encrypt_data(self, data_wrapper):
        # Implement your encryption logic here
        # For demonstration purposes, let's just return the data as is
        return data_wrapper

    def send_to_sink(self, data):
        # Implement your sink logic here
        # For demonstration purposes, let's just print the data
        print(data)