class FileWriter:
    def __init__(self,path):
        self.path = path 

    def sink(self,data_wrapper):
        self.write_to_file(data_wrapper)  
    
    def write_to_file(self,data_wrapper):
        formatted_data = data_wrapper.format_data()
        try:
            with open(self.file_path, 'a') as file:
                file.write(formatted_data)
        except FileNotFoundError:
            with open(self.file_path, 'w') as file:
                file.write(formatted_data)
        except Exception as e:
            print(f"An error occurred: {e}")
        

