import time
from typing import List
from pgpy import PGPKey, PGPMessage
from .data_wrapper import DataWrapper
from getmac import get_mac_address



#        data.machine_id = get_mac_address()

class Processor:
    def __init__(self,key:str):
        self.key = PGPKey.from_blob(key)

    def process_data(self,data):
        timestamp = time.time()
        encrypted_data = self._encrypt(data)
        data_wrapper = DataWrapper(encrypted_data,timestamp)
        return data_wrapper


    def _encrypt(self, data: List) -> List:
        message = PGPMessage.new(data)
        encrypted_message = self.key.encrypt(message)
        return encrypted_message