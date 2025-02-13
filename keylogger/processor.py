import time
from typing import List, Protocol
from pgpy import PGPKey, PGPMessage
from .data_wrapper import DataWrapper


class Process:
    def __init__(self):
        pass

    def process(self, data):
        return self.process_data(data)

    def process_data(self, data):
        timestamp = time.time()
        data_wrapper = DataWrapper(data, timestamp)
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


class Processor(Protocol):
    """
    Processor is a protocol that defines the interface for processing data.

    it will may be implemented by classes that process data in different ways.
    such as:
        Add timestamp to the data
        Encrypt the data
        Compress the data
        Add a unique identifier to the data source
    """

    def process(self, data: List) -> any:
        """
        process the data in some way.
        """
        ...


class ChainProcessor:
    """
    ChainProcessor is a class that chains multiple processors together.
    """

    def __init__(self, processors: List[Processor]):
        self.processors = processors

    def process(self, data: List) -> any:
        for processor in self.processors:
            data = processor.process(data)
        return data


class EncryptProcessor:
    """
    EncryptProcessor is a class that encrypts the data using PGP encryption.
    """

    def __init__(self, key: str):
        self.key = PGPKey.from_blob(key)

    def process(self, data: List) -> any:
        return self._encrypt(data)

    def _encrypt(self, data: List) -> List:
        message = PGPMessage.new(data)
        encrypted_message = self.key.encrypt(message)
        return encrypted_message


class DummyEncryptor:
    def __init__(self):
        pass

    def process(self, data):
        return self._encrypt(data)

    def _encrypt(self, data):
        return data
