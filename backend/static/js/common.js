/**
 * KeyLogger Dashboard - Common Utilities
 * קובץ משותף של פונקציות ועזרים לכל הדפים באפליקציה
 */

// קבועים גלובליים
const API_BASE_URL = "https://loggerstudentproject.onrender.com";
// const API_BASE_URL = "http://localhost:5000";
const TOKEN_KEY = "authToken";
const USER_DATA_KEY = "userData";

/**
 * מחלקת API למערכת
 * מספקת שיטות לתקשורת עם שרת ה-API
 */
class KeyLoggerAPI {
  /**
   * ביצוע קריאת API עם אימות
   * @param {string} endpoint - נקודת הקצה ב-API
   * @param {object} options - אפשרויות נוספות לקריאה
   * @returns {Promise<Response>} - תשובת ה-API
   */
  static async fetchWithAuth(endpoint, options = {}) {
    console.debug("fetchWithAuth", endpoint, options);
    const token = sessionStorage.getItem(TOKEN_KEY);

    if (!token) {
      // אם אין טוקן, הפנייה לדף הכניסה
      window.location.href = "/login";
      return null;
    }

    // הוספת כותרת אימות
    const defaultOptions = {
      headers: {
        Authorization: `Bearer ${token || ""}`,
        "Content-Type": "application/json",
      },
    };

    const fetchOptions = { ...defaultOptions, ...options };

    // אם יש body והוא אינו FormData ואינו מחרוזת, להמיר ל-JSON
    if (
      fetchOptions.body &&
      typeof fetchOptions.body === "object" &&
      !(fetchOptions.body instanceof FormData)
    ) {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }

    try {
      console.log("fetching", `${API_BASE_URL}${endpoint}`, fetchOptions);
      const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

      // בדיקת תקינות הטוקן
      if (response.status === 401) {
        // פג תוקף הטוקן או שאינו תקף
        sessionStorage.removeItem(TOKEN_KEY);
        window.location.href = "/login?error=session_expired";
        return null;
      }

      // בדיקת הרשאות
      if (response.status === 403) {
        showNotification(
          "אין הרשאה",
          "אין לך הרשאות מספיקות לביצוע פעולה זו",
          "error"
        );
        return response;
      }

      return response;
    } catch (error) {
      console.error("API error:", error);
      showNotification("שגיאת תקשורת", "אירעה שגיאה בתקשורת עם השרת", "error");
      return null;
    }
  }

  /**
   * התחברות למערכת
   * @param {string} userId - שם משתמש
   * @param {string} password - סיסמה
   * @returns {Promise<object>} - תשובת ה-API
   */
  static async login(userId, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId, password: password }),
      });

      const data = await response.json();

      if (response.ok) {
        // שמירת הטוקן והנתונים בsessionStorage
        sessionStorage.setItem(TOKEN_KEY, data.token);

        // שמירת מידע על המשתמש
        const userData = {
          userId: userId,
          loginTime: new Date().toISOString(),
        };

        sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

        return { success: true, data };
      } else {
        return { success: false, error: data.error || "אירעה שגיאה בהתחברות" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "שגיאת תקשורת עם השרת" };
    }
  }

  /**
   * התנתקות מהמערכת
   */
  static logout() {
    // מחיקת נתוני המשתמש והטוקן
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_DATA_KEY);

    // מעבר לדף הכניסה
    window.location.href = "/login?logout=true";
  }

  /**
   * קבלת נתוני משתמש מחובר
   * @returns {object|null} - נתוני המשתמש
   */
  static getCurrentUser() {
    const userDataStr = sessionStorage.getItem(USER_DATA_KEY);
    if (!userDataStr) return null;

    try {
      return JSON.parse(userDataStr);
    } catch (e) {
      return null;
    }
  }

  /**
   * בדיקה אם המשתמש מחובר
   * @returns {boolean}
   */
  static isLoggedIn() {
    return !!sessionStorage.getItem(TOKEN_KEY);
  }

  // פונקציות עזר לקריאת API

  /**
   * שליחת GET request
   * @param {string} endpoint - נקודת קצה
   * @returns {Promise<object>} - המידע שחזר
   */
  static async get(endpoint) {
    const response = await this.fetchWithAuth(endpoint);
    if (!response || !response.ok) return null;
    return await response.json();
  }

  /**
   * שליחת POST request
   * @param {string} endpoint - נקודת קצה
   * @param {object} data - נתונים לשליחה
   * @returns {Promise<object>} - המידע שחזר
   */
  static async post(endpoint, data) {
    const response = await this.fetchWithAuth(endpoint, {
      method: "POST",
      body: data,
    });

    if (!response) return null;

    if (response.status === 204) {
      return { success: true };
    }

    try {
      return await response.json();
    } catch (e) {
      return response.ok ? { success: true } : { success: false };
    }
  }

  /**
   * שליחת PUT request
   * @param {string} endpoint - נקודת קצה
   * @param {object} data - נתונים לשליחה
   * @returns {Promise<object>} - המידע שחזר
   */
  static async put(endpoint, data) {
    const response = await this.fetchWithAuth(endpoint, {
      method: "PUT",
      body: data,
    });

    if (!response) return null;

    if (response.status === 204) {
      return { success: true };
    }

    try {
      return await response.json();
    } catch (e) {
      return response.ok ? { success: true } : { success: false };
    }
  }

  /**
   * שליחת DELETE request
   * @param {string} endpoint - נקודת קצה
   * @returns {Promise<boolean>} - האם המחיקה הצליחה
   */
  static async delete(endpoint) {
    const response = await this.fetchWithAuth(endpoint, {
      method: "DELETE",
    });

    return response && response.ok;
  }
}

/**
 * פונקציות עזר למסכי המערכת
 */

/**
 * הצגת הודעה קופצת
 * @param {string} title - כותרת ההודעה
 * @param {string} message - תוכן ההודעה
 * @param {string} type - סוג ההודעה: 'info', 'success', 'warning', 'error'
 */
function showNotification(title, message, type = "info") {
  // בדיקה אם יש תמיכה ב-Toast של Bootstrap
  if (
    typeof bootstrap === "undefined" ||
    !document.getElementById("notification-toast")
  ) {
    // אם אין, הצג באמצעות alert
    alert(`${title}: ${message}`);
    return;
  }

  const toast = document.getElementById("notification-toast");
  const toastTitle = document.getElementById("toast-title");
  const toastMessage = document.getElementById("toast-message");
  const toastIcon = document.getElementById("toast-icon");
  const toastTime = document.getElementById("toast-time");

  // קביעת סוג ההודעה
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  toastTime.textContent = new Date().toLocaleTimeString();

  // התאמת האייקון לסוג ההודעה
  toastIcon.className = "fas me-2";
  switch (type) {
    case "success":
      toastIcon.classList.add("fa-check-circle");
      toastIcon.style.color = "#198754";
      break;
    case "error":
      toastIcon.classList.add("fa-exclamation-circle");
      toastIcon.style.color = "#dc3545";
      break;
    case "warning":
      toastIcon.classList.add("fa-exclamation-triangle");
      toastIcon.style.color = "#fd7e14";
      break;
    default:
      toastIcon.classList.add("fa-info-circle");
      toastIcon.style.color = "#0dcaf0";
  }

  // הצגת ההודעה
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}

/**
 * הצגת חלון אישור
 * @param {string} title - כותרת החלון
 * @param {string} message - הודעה
 * @param {function} onConfirm - פונקציה שתופעל בעת אישור
 * @param {function} onCancel - פונקציה שתופעל בעת ביטול
 */
function showConfirmation(title, message, onConfirm, onCancel = null) {
  // בדיקה אם יש תמיכה במודאלים של Bootstrap
  if (typeof bootstrap === "undefined") {
    // אם אין, הצג באמצעות confirm
    if (confirm(message)) {
      if (onConfirm) onConfirm();
    } else {
      if (onCancel) onCancel();
    }
    return;
  }

  // בדיקה אם יש מודאל אישור מוגדר
  const confirmModal = document.getElementById("confirmationModal");
  if (!confirmModal) {
    // יצירת מודאל אישור
    const modalDiv = document.createElement("div");
    modalDiv.className = "modal fade";
    modalDiv.id = "confirmationModal";
    modalDiv.tabIndex = "-1";
    modalDiv.setAttribute("aria-hidden", "true");

    modalDiv.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="confirmationTitle">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="confirmationMessage">
                        ${message}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="confirmationCancel">ביטול</button>
                        <button type="button" class="btn btn-primary" id="confirmationConfirm">אישור</button>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modalDiv);

    const modal = new bootstrap.Modal(modalDiv);

    document
      .getElementById("confirmationConfirm")
      .addEventListener("click", function () {
        modal.hide();
        if (onConfirm) onConfirm();
      });

    document
      .getElementById("confirmationCancel")
      .addEventListener("click", function () {
        if (onCancel) onCancel();
      });

    modalDiv.addEventListener("hidden.bs.modal", function () {
      if (onCancel) onCancel();
    });

    modal.show();
  } else {
    // שימוש במודאל קיים
    document.getElementById("confirmationTitle").textContent = title;
    document.getElementById("confirmationMessage").textContent = message;

    const confirmBtn = document.getElementById("confirmationConfirm");
    const cancelBtn = document.getElementById("confirmationCancel");

    // בדיקה שהכפתורים קיימים לפני ניסיון לשכפל אותם
    if (confirmBtn && cancelBtn) {
      // הסרת מאזינים קודמים
      const newConfirmBtn = confirmBtn.cloneNode(true);
      const newCancelBtn = cancelBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

      // הוספת מאזינים חדשים
      newConfirmBtn.addEventListener("click", function () {
        bootstrap.Modal.getInstance(confirmModal).hide();
        if (onConfirm) onConfirm();
      });

      newCancelBtn.addEventListener("click", function () {
        if (onCancel) onCancel();
      });
    } else {
      // אם הכפתורים לא קיימים, נוסיף מאזינים ישירות למודאל
      const modal = new bootstrap.Modal(confirmModal);

      // נמצא את הכפתורים אחרי שהמודאל נוצר
      const confirmButton = document.getElementById("confirmationConfirm");
      const cancelButton = document.getElementById("confirmationCancel");

      if (confirmButton) {
        confirmButton.addEventListener("click", function () {
          modal.hide();
          if (onConfirm) onConfirm();
        });
      }

      if (cancelButton) {
        cancelButton.addEventListener("click", function () {
          if (onCancel) onCancel();
        });
      }

      confirmModal.addEventListener("hidden.bs.modal", function () {
        if (onCancel) onCancel();
      });

      modal.show();
      return;
    }

    // הצגת המודאל
    const modal = new bootstrap.Modal(confirmModal);
    modal.show();
  }
}

/**
 * הצגת אינדיקטור טעינה
 * @param {boolean} show - האם להציג או להסתיר
 */
function showLoading(show = true) {
  // בדיקה אם יש אלמנט אינדיקטור טעינה
  let loadingEl = document.getElementById("loadingSpinner");

  if (!loadingEl) {
    // יצירת אלמנט טעינה
    loadingEl = document.createElement("div");
    loadingEl.className = "loading-spinner";
    loadingEl.id = "loadingSpinner";
    loadingEl.innerHTML = `
            <div class="spinner-border text-light" role="status">
                <span class="visually-hidden">טוען...</span>
            </div>
        `;

    // סגנון האלמנט
    loadingEl.style.position = "fixed";
    loadingEl.style.top = "0";
    loadingEl.style.left = "0";
    loadingEl.style.width = "100%";
    loadingEl.style.height = "100%";
    loadingEl.style.backgroundColor = "rgba(0,0,0,0.5)";
    loadingEl.style.display = "flex";
    loadingEl.style.justifyContent = "center";
    loadingEl.style.alignItems = "center";
    loadingEl.style.zIndex = "9999";

    document.body.appendChild(loadingEl);
  }

  loadingEl.style.display = show ? "flex" : "none";
}

/**
 * בדיקת תקינות הרשאות
 * מנתב משתמשים לא מורשים בחזרה לדף הכניסה
 */
function checkAuth() {
  if (!KeyLoggerAPI.isLoggedIn()) {
    window.location.href = "/login";
    return false;
  }
  return true;
}

/**
 * פורמט תאריך לתצוגה
 * @param {string|Date} date - התאריך לפורמט
 * @param {boolean} includeTime - האם לכלול את השעה
 * @returns {string} - התאריך המפורמט
 */
function formatDate(date, includeTime = true) {
  if (!date) return "-";

  const d = new Date(date);

  // בדיקה אם התאריך תקין
  if (isNaN(d.getTime())) return "-";

  if (includeTime) {
    return d.toLocaleString();
  } else {
    return d.toLocaleDateString();
  }
}

/**
 * קיצור מחרוזת ארוכה
 * @param {string} str - המחרוזת המקורית
 * @param {number} maxLength - אורך מקסימלי
 * @returns {string} - המחרוזת המקוצרת
 */
function truncateString(str, maxLength = 100) {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}

/**
 * העתקת טקסט ללוח
 * @param {string} text - הטקסט להעתקה
 * @param {Element} buttonEl - אלמנט הכפתור שהופעל (אופציונלי)
 */
function copyToClipboard(text, buttonEl = null) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // הצגת הודעה
      if (buttonEl) {
        const originalText = buttonEl.innerHTML;
        buttonEl.innerHTML = '<i class="fas fa-check"></i> הועתק';

        setTimeout(() => {
          buttonEl.innerHTML = originalText;
        }, 2000);
      } else {
        showNotification("הועתק", "הטקסט הועתק ללוח", "success");
      }
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
      showNotification("שגיאה", "לא ניתן להעתיק את הטקסט", "error");
    });
}

/**
 * יצוא נתונים ל-CSV
 * @param {Array} data - מערך של אובייקטים
 * @param {string} filename - שם הקובץ
 */
function exportToCSV(data, filename) {
  if (!data || !data.length) {
    showNotification("ייצוא נכשל", "אין נתונים לייצוא", "warning");
    return;
  }

  try {
    // יצירת כותרות
    const headers = Object.keys(data[0]);
    let csvContent = "data:text/csv;charset=utf-8,";

    // הוספת שורת כותרות
    csvContent += headers.join(",") + "\n";

    // הוספת שורות נתונים
    data.forEach((item) => {
      const row = headers.map((header) => {
        let cell = item[header] || "";

        // טיפול במקרים מיוחדים
        if (typeof cell === "object") {
          cell = JSON.stringify(cell);
        }

        // ניקוי מירכאות
        cell = cell.toString().replace(/"/g, '""');

        // הוספת מירכאות אם יש פסיקים או מירכאות
        if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
          cell = `"${cell}"`;
        }

        return cell;
      });

      csvContent += row.join(",") + "\n";
    });

    // יצירת קישור להורדה
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      filename || `export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification("ייצוא הושלם", "הנתונים יוצאו בהצלחה", "success");
  } catch (error) {
    console.error("Export error:", error);
    showNotification("ייצוא נכשל", "אירעה שגיאה בייצוא הנתונים", "error");
  }
}

/**
 * בדיקת פרמטרים ב-URL
 * @param {string} param - שם הפרמטר
 * @returns {string|null} - ערך הפרמטר
 */
function getUrlParam(param) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get(param);
}

// בדיקת אימות בטעינת הדף
document.addEventListener("DOMContentLoaded", function () {
  // בדיקת הודעות התחברות/התנתקות
  const error = getUrlParam("error");
  const logout = getUrlParam("logout");

  if (error === "session_expired") {
    showNotification("פג תוקף החיבור", "נא להתחבר מחדש", "warning");
  }

  if (logout === "true") {
    showNotification("התנתקות", "התנתקת בהצלחה מהמערכת", "info");
  }
});
