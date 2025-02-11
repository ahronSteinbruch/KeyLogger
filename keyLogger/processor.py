from typing import List, Protocol
from sinker import Sinker


class Processor(Protocol):
    sink: Sinker
    """
    Processor is a protocol that defines the interface for processing data.

    it will may be implemented by classes that process data in different ways.
    such as:
        Add timestamp to the data
        Encrypt the data
        Compress the data
        Add a unique identifier to the data source
    """

    def process(self, data: List) -> None:
        """
        process the data in some way.
        """
        ...
