import logging
from .manager import DefaultManager as manager

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    manager().run()
