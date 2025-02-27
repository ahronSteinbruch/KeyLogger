import logging
import re
import time
import ctypes
import ctypes.wintypes
import threading
from typing import Callable
from dataclasses import dataclass


EVENT_SYSTEM_FOREGROUND = 0x0003
WINEVENT_OUTOFCONTEXT = 0x0000

logger = logging.getLogger(__name__)


@dataclass
class WindowInfo:
    """מחלקה המייצגת מידע על חלון"""

    handle: int
    title: str
    process_id: int
    process_name: str


class WindowTracker:
    """מעקב חלונות עבור Windows"""

    def __init__(self, callback: Callable[[WindowInfo], None]):
        """
        יוצר מעקב חלונות

        Args:
            callback: פונקציה שתיקרא כאשר החלון הפעיל משתנה
        """
        self.callback = callback
        self._running = False
        self._thread = None

        # טעינת ספריות
        self.user32 = ctypes.windll.user32
        self.ole32 = ctypes.windll.ole32
        self.kernel32 = ctypes.windll.kernel32

        # נסה לייבא psutil
        try:
            import psutil

            self.psutil = psutil
        except ImportError:
            self.psutil = None
            logger.warning(
                "psutil not found. Process names will not be available.")

        # הגדרת פרוטוטיפ לפונקצית Callback
        self.WinEventProcType = ctypes.WINFUNCTYPE(
            None,
            ctypes.wintypes.HANDLE,
            ctypes.wintypes.DWORD,
            ctypes.wintypes.HWND,
            ctypes.wintypes.LONG,
            ctypes.wintypes.LONG,
            ctypes.wintypes.DWORD,
            ctypes.wintypes.DWORD,
        )

        # הגדרת טיפוס החזרה עבור SetWinEventHook
        self.user32.SetWinEventHook.restype = ctypes.wintypes.HANDLE

        # שמירת hook handle
        self.hook = None

        # הגדרת message-only window לאפשר שליחת הודעות לdispatcher
        self.hwnd = None

    def _get_process_name(self, process_id: int) -> str:
        """
        מקבל את שם התהליך לפי מזהה התהליך

        Args:
            process_id: מזהה התהליך

        Returns:
            שם התהליך או "Unknown" אם לא נמצא
        """
        if self.psutil is None:
            return f"PID:{process_id}"

        try:
            process = self.psutil.Process(process_id)
            return process.name()
        except Exception:  # תפיסת כל סוגי השגיאות
            return f"PID:{process_id}"

    def _get_window_process_id(self, hwnd):
        """
        מקבל את מזהה התהליך של חלון

        Args:
            hwnd: מזהה החלון

        Returns:
            מזהה התהליך
        """
        pid = ctypes.c_ulong()
        self.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        return pid.value

    def _window_event_handler(
        self,
        hWinEventHook,
        event,
        hwnd,
        idObject,
        idChild,
        dwEventThread,
        dwmsEventTime,
    ):
        """
        מטפל באירועי חלונות

        Args:
            מידע על האירוע שהתרחש (פרמטרים סטנדרטיים של WinEventProc)
        """
        if event == EVENT_SYSTEM_FOREGROUND:
            try:
                # קבלת כותרת החלון
                length = self.user32.GetWindowTextLengthW(hwnd)
                buff = ctypes.create_unicode_buffer(length + 1)
                self.user32.GetWindowTextW(hwnd, buff, length + 1)
                title = buff.value

                # קבלת מזהה תהליך
                process_id = self._get_window_process_id(hwnd)

                # קבלת שם תהליך
                process_name = self._get_process_name(process_id)

                # Remove unwanted characters from the title
                title = re.sub(r"[\x00-\x1f]", "", title)

                # יצירת אובייקט WindowInfo
                window_info = WindowInfo(
                    handle=hwnd,
                    title=title,
                    process_id=process_id,
                    process_name=process_name,
                )

                logger.debug("new window: %s", window_info)
                # קריאה לפונקצית callback
                self.callback(window_info)

            except Exception as e:
                logger.error(f"Failed to handle window event: {e}")

    def _message_loop(self):
        """
        לולאת הודעות - רצה בתהליך נפרד
        """
        # אתחול COM בתהליך החדש
        self.ole32.CoInitialize(0)

        # יצירת אובייקט לפונקצית callback
        self.WinEventProc = self.WinEventProcType(self._window_event_handler)

        # רישום לאירועי שינוי חלון פעיל
        self.hook = self.user32.SetWinEventHook(
            EVENT_SYSTEM_FOREGROUND,
            EVENT_SYSTEM_FOREGROUND,
            0,
            self.WinEventProc,
            0,
            0,
            WINEVENT_OUTOFCONTEXT,
        )

        if self.hook == 0:
            logger.error("Failed to set WinEvent hook")
            self._running = False
            return

        logger.debug("WinEvent hook set successfully")

        # הגדרת מבנה הודעה
        msg = ctypes.wintypes.MSG()

        # לולאת הודעות
        while self._running:
            # קבלת הודעות וטיפול בהן
            result = self.user32.GetMessageW(ctypes.byref(msg), 0, 0, 0)

            # בדיקה אם לולאת ההודעות קיבלה WM_QUIT או שגיאה
            if result in (0, -1):
                break

            self.user32.TranslateMessageW(ctypes.byref(msg))
            self.user32.DispatchMessageW(ctypes.byref(msg))

        # ניקוי
        if self.hook:
            self.user32.UnhookWinEvent(self.hook)
            self.hook = None

        # שחרור COM
        self.ole32.CoUninitialize()

        logger.debug("Message loop ended")

    def start(self):
        """מתחיל את המעקב אחר החלון הפעיל"""
        if self._running:
            return

        self._running = True

        # הפעלת לולאת ההודעות בתהליך נפרד
        self._thread = threading.Thread(target=self._message_loop)
        self._thread.daemon = True
        self._thread.start()

    def stop(self):
        """מפסיק את המעקב"""
        if not self._running:
            return

        self._running = False

        # שלח הודעת WM_QUIT ללולאת ההודעות
        try:
            self.user32.PostThreadMessageW(
                self._thread.ident, 0x0012, 0, 0
            )  # 0x0012 = WM_QUIT
        except Exception as e:
            logger.error(f"Failed to post WM_QUIT message: {e}")

        # המתן לסיום התהליך
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)  # חכה עד שניה

        logger.debug("WindowsTracker stopped")


# דוגמת שימוש
if __name__ == "__main__":

    def window_changed(window_info: WindowInfo):
        print(
            f"""
חלון פעיל חדש:
כותרת: {window_info.title}
תהליך: {window_info.process_name} (PID: {window_info.process_id})
מזהה חלון: {window_info.handle}
"""
        )

    try:
        tracker = WindowTracker(callback=window_changed)
        print("מתחיל מעקב אחר חלונות... (CTRL+C כדי לעצור)")
        tracker.start()

        # לולאה שמאפשרת לתפוס Ctrl+C
        while True:
            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\nקלט משתמש התקבל להפסקת התוכנית...")
        tracker.stop()
        print("התוכנית הסתיימה")
    except Exception as e:
        print(f"שגיאה: {e}")
