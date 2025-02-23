from typing import Protocol
from file_writer import FileWriter

__all__ = ["Sinker", "MultiSinker", "FileWriter"]


class Sinker(Protocol):
    """
    Sinker is a protocol that defines the interface for sinking data.

    it will may be implemented by classes that sink data in different ways.
    such as:
        Write data to a file
        Send data to a remote server
        Print data to the console
    """

    def sink(self, data: str) -> None:
        """
        sink the data in some way.
        """
        ...


class MultiSinker:
    """
    MultiSinker is a class that sinks data to multiple sinkers.
    """

    def __init__(self, sinkers: list[Sinker]):
        self.sinkers = sinkers

    def sink(self, data: str) -> None:
        for sinker in self.sinkers:
            sinker.sink(data)
