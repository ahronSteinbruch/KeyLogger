import requests


class NetworkWriter:
    def __init__(self, url):
        self.url = url

    def sink(self, data_wrapper):
        self.send_to_network(data_wrapper)

    def send_to_network(self, data_wrapper):
        formatted_data = data_wrapper.format_as_dict()
        try:
            response = requests.post(self.url, json=formatted_data)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"An error occurred: {e}")

# Example usage:
# Assuming ClassData is defined elsewhere and has a method format_as_dict()
# class_data_instance = ClassData()
# network_writer = NetworkWriter('http://example.com/api')
# network_writer.sink(class_data_instance)
