// בדיקה אם המשתמש כבר מחובר
document.addEventListener("DOMContentLoaded", function () {
  if (KeyLoggerAPI.isLoggedIn()) {
    window.location.href = "/dashboard";
  }

  // בדיקת הודעת שגיאה מפרמטר URL
  const error = getUrlParam("error");
  if (error === "session_expired") {
    showNotification("פג תוקף החיבור", "נא להתחבר מחדש", "warning");
  } else if (error === "auth_required") {
    showNotification("נדרשת התחברות", "יש להתחבר למערכת תחילה", "warning");
  }
});

// התחברות למערכת
document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const userId = document.getElementById("userId").value;
    const password = document.getElementById("password").value;
    const acceptDisclaimer =
      document.getElementById("acceptDisclaimer").checked;
    const loginAlert = document.getElementById("loginAlert");

    // וידוא שהתנאים התקבלו
    if (!acceptDisclaimer) {
      loginAlert.textContent = "יש לאשר את תנאי השימוש כדי להמשיך";
      loginAlert.classList.remove("d-none");
      return;
    }

    // איפוס הודעת שגיאה קודמת
    loginAlert.classList.add("d-none");

    try {
      // הצגת מסך טעינה
      showLoading(true);

      // שימוש במחלקת KeyLoggerAPI מהקובץ המשותף
      const result = await KeyLoggerAPI.login(userId, password);

      if (result.success) {
        // מעבר לדף הבא
        window.location.href = "/dashboard";
      } else {
        // הצגת שגיאה
        loginAlert.textContent =
          result.error || "שגיאה בהתחברות. אנא נסה שנית.";
        loginAlert.classList.remove("d-none");
        showLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      loginAlert.textContent = "שגיאת התחברות. אנא בדוק את החיבור לשרת.";
      loginAlert.classList.remove("d-none");
      showLoading(false);
    }
  });
