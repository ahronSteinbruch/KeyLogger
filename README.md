keyLogger  project


Overview:

This cross-platform keylogger captures keystrokes,
processes the data,and sends it to a configured endpoint.
It supports local file logging
and remote network logging via an HTTP server.
Additionally,the keylogger includes a Command & Control 
(C2C) mechanism for remote control of its operations.

Features:

* Supports Windows and Linux
* Captures keystrokes in real-time
* Processes data before storage or transmission
* Saves logs to a file or sends them to a remote server
* Periodic data transmission with configurable intervals
* Remote control functionality via a C2C server

Requirements:

* Python 3.6+
* requests package

Installation:

1. Clone the repository:
git clone https://github.com/your-repo/keylogger.git
cd keylogger

2. Install dependencies:
pip install -r requirements.txt


Usage:

### Running the Keylogger
To start the keylogger with default settings:
python -m keylogger

To specify a log file and endpoint:
python backand/app.py

### Command & Control (C2C)
The keylogger periodically checks for commands from the C2C server. Available commands:

* start – Starts logging
* stop – Stops logging
* exit – Terminates the process

Configuration:

* log_path: Path to store logs
* endpoint: Remote server URL for log transmission
* push_interval: Time (in seconds) between data transmissions


Disclaimer:

This software is intended for educational
and ethical use only. Unauthorized usage is illegal and punishable by law.






