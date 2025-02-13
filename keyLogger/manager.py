from typing import Protocol
from sinker import Sinker
from processor import Process
from listner import Listner


class Manager(Protocol):
    sink: Sinker
    processor: Process
    listner: Listner

    """
    Manager is a protocol that defines the interface for managing the keylogger.
    """

    def start(self) -> None:
        """
        start the manager.
        """
        ...
