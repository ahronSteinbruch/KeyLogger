let isAdmin = false;

// בדיקת אימות והרשאות
async function checkAuth() {
  // בדיקה שהמשתמש מחובר
  if (!KeyLoggerAPI.isLoggedIn()) {
    window.location.href = "/login?error=auth_required";
    return;
  }

  showLoading(true);

  try {
    // בדיקה אם יש הרשאות מנהל
    const response = await KeyLoggerAPI.fetchWithAuth("/api/agents");

    if (response && response.ok) {
      // למשתמש יש הרשאות מנהל
      isAdmin = true;
      document
        .querySelectorAll(".admin-only")
        .forEach((el) => (el.style.display = "block"));
    }

    // הצגת שם המשתמש
    const userData = KeyLoggerAPI.getCurrentUser();
    if (userData) {
      document.getElementById("user-name").textContent = userData.userId;
    }

    // טעינת נתוני דשבורד
    await loadDashboardData();
  } catch (error) {
    console.error("Auth check error:", error);
    showNotification("שגיאה", "אירעה שגיאה בטעינת נתוני המשתמש", "error");
  } finally {
    hideLoading();
  }
}

// הסתרת מסך טעינה
function hideLoading() {
  showLoading(false);
}

// טעינת נתוני דשבורד
async function loadDashboardData() {
  try {
    // טעינת נתוני מחשבים
    console.debug("Loading dashboard data...");
    const machinesData = await KeyLoggerAPI.get("/api/machine");

    if (machinesData) {
      document.getElementById("machines-count").textContent =
        machinesData.length;

      // מחשבים פעילים (לצורך הדוגמה, 70% מהמחשבים פעילים)
      document.getElementById("active-machines-count").textContent = Math.round(
        machinesData.length * 0.7
      );

      // הצגת סקירת מחשבים
      updateMachinesOverview(machinesData);
    }

    // טעינת נתוני משתמשים
    if (isAdmin) {
      const usersData = await KeyLoggerAPI.get("/api/agents");

      if (usersData) {
        document.getElementById("users-count").textContent = usersData.length;
      }
    } else {
      document.getElementById("users-count").textContent = "-";
    }

    // טעינת נתוני קיילוגר
    const logData = await KeyLoggerAPI.get("/api/data");

    if (logData) {
      document.getElementById("data-count").textContent = logData.length;

      // הצגת פעילות אחרונה
      updateRecentActivity(logData.slice(0, 5));
    }

    // עדכון זמן אחרון
    document.getElementById(
      "last-update"
    ).textContent = `עודכן לאחרונה: ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    console.error("Dashboard data error:", error);
    showNotification(
      "שגיאת טעינה",
      "אירעה שגיאה בטעינת נתוני הדשבורד",
      "error"
    );
  }
}

// עדכון סקירת מחשבים
function updateMachinesOverview(machines) {
  const container = document.getElementById("machines-overview");
  container.innerHTML = "";

  if (machines.length === 0) {
    container.innerHTML = '<p class="text-center">אין מחשבים זמינים</p>';
    return;
  }

  const machineList = document.createElement("div");
  machineList.className = "list-group";

  machines.slice(0, 5).forEach((machine) => {
    const item = document.createElement("a");
    item.href = "/machines?id=" + machine.machine_id;
    item.className =
      "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
    item.innerHTML = `
                    <div>
                        <i class="fas fa-desktop me-2"></i>
                        <span>${
                          machine.name || machine.info?.pc_name || "מחשב ללא שם"
                        }</span>
                    </div>
                    <span class="badge bg-success rounded-pill">פעיל</span>
                `;

    machineList.appendChild(item);
  });

  container.appendChild(machineList);

  if (machines.length > 5) {
    const viewMoreBtn = document.createElement("button");
    viewMoreBtn.className = "btn btn-sm btn-link d-block mx-auto mt-2";
    viewMoreBtn.textContent = "הצג עוד...";
    viewMoreBtn.addEventListener("click", function () {
      window.location.href = "/machines";
    });
    container.appendChild(viewMoreBtn);
  }
}

// עדכון פעילות אחרונה
function updateRecentActivity(activities) {
  const tbody = document.getElementById("recent-activity");
  tbody.innerHTML = "";

  if (activities.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="3" class="text-center">אין פעילות אחרונה</td>';
    tbody.appendChild(row);
    return;
  }

  activities.forEach((activity) => {
    const row = document.createElement("tr");
    const timestamp = new Date(activity.timestamp);

    row.innerHTML = `
                    <td>${formatDate(timestamp)}</td>
                    <td>${activity.machine_id}</td>
                    <td>רשומת מקלדת נאספה</td>
                `;

    tbody.appendChild(row);
  });
}

// הגדרת אירוע התנתקות
document.getElementById("logout-link").addEventListener("click", function (e) {
  e.preventDefault();
  KeyLoggerAPI.logout();
});

// בדיקת אימות וטעינת דף ראשי
document.addEventListener("DOMContentLoaded", function () {
  checkAuth();
});
