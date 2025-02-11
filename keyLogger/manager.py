from typing import Protocol

from .sinker import Sinker
from .processor import Processor
from .listner import Listner


class Manager(Protocol):
    sink: Sinker
    processor: Processor
    listner: Listner

    """
    Manager is a protocol that defines the interface for managing the keylogger.
    """

    def start(self) -> None:
        """
        start the manager.
        """
        ...
