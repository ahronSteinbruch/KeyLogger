// קבועים לשימוש בכל המערכת
const SERVER_AUTH_URL = 'http://192.168.150.165:5000/auth';  // כתובת השרת לאימות
const SERVER_APP_URL = 'http://192.168.150.165:5000/app';    // כתובת השרת לאפליקציה
const ADMIN_ROUTE = '/admin';                                // נתיב לממשק מנהל

// מערך לשמירת המשתמשים המחוברים (רק בצד לקוח)
let loggedInUsers = [];

/**
 * פונקציה לאימות משתמש מול השרת
 * @returns {Promise<boolean>} האם האימות הצליח
 */
async function loginUser() {
    // קבלת נתוני המשתמש מהטופס
    const userId = document.getElementById('userId').value;
    const userPassword = document.getElementById('userCode').value;
    
    // וידוא שכל השדות מלאים
    if (userId === "" || userPassword === "") {
        showMessage("אנא מלא את כל השדות.", "error");
        return false;
    }
    
    // בדיקת תקינות מספר הזהות (9 ספרות)
    if (!/^\d{9}$/.test(userId)) {
        showMessage("מספר הזהות חייב לכלול 9 ספרות.", "error");
        return false;
    }
    
    try {
        // שליחת בקשה לשרת לאימות המשתמש
        const response = await fetch(SERVER_AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: userId,
                password: userPassword
            }),
            credentials: 'include' // לשמירת עוגיות הסשן
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showMessage(data.message || "שגיאה בתהליך ההתחברות", "error");
            return false;
        }
        
        // שמירת פרטי המשתמש ברשימה המקומית (לצורך ממשק המנהל)
        const currentTime = new Date().toLocaleTimeString();
        loggedInUsers.push({ 
            id: userId, 
            time: currentTime,
            userType: data.userType // משתמש רגיל או מנהל
        });
        
        // הודעה על הצלחה
        showMessage("ההתחברות הצליחה!", "success");
        
        // הפניה לדף המתאים לפי סוג המשתמש
        if (data.userType === 'admin') {
            window.location.href = SERVER_APP_URL + ADMIN_ROUTE;
        } else {
            window.location.href = SERVER_APP_URL;
        }
        
        return true;
    } catch (error) {
        console.error('שגיאת התחברות:', error);
        showMessage("שגיאה בתקשורת עם השרת. אנא נסה שוב מאוחר יותר.", "error");
        return false;
    }
}

/**
 * פונקציה להצגת הודעות למשתמש
 * @param {string} message תוכן ההודעה
 * @param {string} type סוג ההודעה (error/success/info)
 */
function showMessage(message, type = 'info') {
    // בדיקה אם קיים אלמנט להודעות
    let messageElement = document.getElementById('messageBox');
    
    // יצירת אלמנט חדש אם לא קיים
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'messageBox';
        document.body.appendChild(messageElement);
        
        // עיצוב בסיסי
        messageElement.style.padding = '10px';
        messageElement.style.margin = '10px 0';
        messageElement.style.borderRadius = '5px';
        messageElement.style.textAlign = 'center';
        messageElement.style.direction = 'rtl';
    }
    
    // הגדרת סגנון לפי סוג ההודעה
    switch (type) {
        case 'error':
            messageElement.style.backgroundColor = '#ffebee';
            messageElement.style.color = '#c62828';
            messageElement.style.border = '1px solid #ef9a9a';
            break;
        case 'success':
            messageElement.style.backgroundColor = '#e8f5e9';
            messageElement.style.color = '#2e7d32';
            messageElement.style.border = '1px solid #a5d6a7';
            break;
        default:
            messageElement.style.backgroundColor = '#e3f2fd';
            messageElement.style.color = '#1565c0';
            messageElement.style.border = '1px solid #90caf9';
    }
    
    // הצגת ההודעה
    messageElement.textContent = message;
    
    // הסתרת ההודעה אחרי 5 שניות
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
    
    // הצגת האלמנט אם הוא מוסתר
    messageElement.style.display = 'block';
}

/**
 * פונקציה להצגת רשימת המשתמשים המחוברים (עבור מנהל בלבד)
 */
async function showUserLogs() {
    try {
        // בדיקה אם המשתמש הוא מנהל (בצד שרת)
        const response = await fetch(SERVER_AUTH_URL + '/verify-admin', {
            method: 'GET',
            credentials: 'include' // שליחת עוגיות הסשן
        });
        
        if (!response.ok) {
            showMessage("אין לך הרשאות צפייה בנתונים אלה", "error");
            return;
        }
        
        // הצגת החלק של המנהל בממשק
        document.getElementById('adminSection').style.display = 'block';
        
        // קבלת רשימת המשתמשים מהשרת
        const logsResponse = await fetch(SERVER_AUTH_URL + '/logs', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!logsResponse.ok) {
            showMessage("שגיאה בטעינת נתוני המשתמשים", "error");
            return;
        }
        
        const userLogs = await logsResponse.json();
        
        // הצגת הנתונים בטבלה
        const userListElement = document.getElementById('userList');
        userListElement.innerHTML = '';
        
        userLogs.forEach((user, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${user.id}</td>
                <td>${user.time}</td>
                <td>${user.userType === 'admin' ? 'מנהל' : 'משתמש רגיל'}</td>
            `;
            userListElement.appendChild(row);
        });
        
    } catch (error) {
        console.error('שגיאה בטעינת נתוני משתמשים:', error);
        showMessage("שגיאה בתקשורת עם השרת", "error");
    }
}

/**
 * פונקציה להורדת רשימת המשתמשים כקובץ CSV
 */
async function downloadUserList() {
    try {
        // בדיקה אם המשתמש הוא מנהל
        const response = await fetch(SERVER_AUTH_URL + '/verify-admin', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            showMessage("אין לך הרשאות להוריד נתונים אלה", "error");
            return;
        }
        
        // קבלת הנתונים מהשרת
        const logsResponse = await fetch(SERVER_AUTH_URL + '/logs', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!logsResponse.ok) {
            showMessage("שגיאה בטעינת נתוני המשתמשים", "error");
            return;
        }
        
        const userLogs = await logsResponse.json();
        
        // יצירת תוכן הקובץ
        let userListText = 'מספר,מספר זהות,שעת כניסה,סוג משתמש\n';
        userLogs.forEach((user, index) => {
            userListText += `${index + 1},${user.id},${user.time},${user.userType === 'admin' ? 'מנהל' : 'משתמש רגיל'}\n`;
        });
        
        // הורדת הקובץ
        const blob = new Blob([userListText], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user_logs_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
    } catch (error) {
        console.error('שגיאה בהורדת נתוני משתמשים:', error);
        showMessage("שגיאה בתקשורת עם השרת", "error");
    }
}

/**
 * פונקציה להתנתקות מהמערכת
 */
async function logout() {
    try {
        await fetch(SERVER_AUTH_URL + '/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        showMessage("התנתקת בהצלחה", "success");
        
        // הפניה לדף הכניסה
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
        
    } catch (error) {
        console.error('שגיאה בהתנתקות:', error);
        showMessage("שגיאה בתקשורת עם השרת", "error");
    }
}
