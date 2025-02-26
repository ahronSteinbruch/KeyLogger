import requests


class NetworkWriter:
    def __init__(self, url):
        self.url = url

    def sink(self, data_wrapper):
        formatted_data = data_wrapper.format_as_dict()
        try:
            response = requests.post(self.url, json=formatted_data)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"An error occurred: {e}")


if __name__ == "__main__":
    # This is just a test code
    nw = NetworkWriter("http://localhost:5000/machine")
    nw.sink(
        {
            "data": "test",
            "machine_id": "test",
            "timestamp": 0,
            "active_window": "test",
            "start_time": "",
            "end_time": "",
            "encrypted": "",
        }
    )
