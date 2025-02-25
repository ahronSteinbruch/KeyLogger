const ENDPOINT = "http://192.168.150.165:5000"
const SERVER_AUTH_URL = ENDPOINT + '/loggin';  // כתובת השרת לאימות
const SERVER_USER_URL = ENDPOINT + '/users'; // כתובת השרת לניהול משתמשים
/**
 * פונקציה לאימות מנהל מול השרת
 * @returns {Promise<boolean>} האם האימות הצליח
 */
async function loginAdmin() {
    // קבלת נתוני המנהל מהטופס
    const adminPassword = document.getElementById('adminPassword').value;
    
    // וידוא שהשדה מלא
    if (adminPassword === "") {
        showMessage("אנא מלא את השדה.", "error");
        return false;
    }
    
    try {
        // שליחת בקשה לשרת לאימות המנהל
        const response = await fetch(SERVER_AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                password: adminPassword
            }),
            credentials: 'include' // לשמירת עוגיות הסשן
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showMessage(data.message || "שגיאה בתהליך ההתחברות", "error");
            return false;
        }
        
        // הצגת ממשק המנהל
        document.getElementById('adminSection').style.display = 'block';
        loadUserList();
        
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
 * פונקציה לטעינת רשימת המשתמשים מהשרת
 */
async function loadUserList() {
    try {
        const response = await fetch(SERVER_USER_URL, {
            method: 'GET',
            credentials: 'include'
        });
        
        const users = await response.json();
        
        if (!response.ok) {
            showMessage(users.message || "שגיאה בטעינת רשימת המשתמשים", "error");
            return;
        }
        
        const userList = document.getElementById('userList');
        userList.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.identity}</td>
                <td>${user.loginTime}</td>
                <td>
                    <button onclick="removeUser('${user.id}')">הסר</button>
                </td>
            `;
            userList.appendChild(row);
        });
    } catch (error) {
        console.error('שגיאה בטעינת רשימת המשתמשים:', error);
        showMessage("שגיאה בתקשורת עם השרת. אנא נסה שוב מאוחר יותר.", "error");
    }
}

/**
 * פונקציה להוספת משתמש חדש
 */
async function addUser() {
    const userId = prompt("הכנס מספר זהות של המשתמש החדש:");
    
    if (!userId || !/^\d{9}$/.test(userId)) {
        showMessage("מספר הזהות חייב לכלול 9 ספרות.", "error");
        return;
    }
    
    try {
        const response = await fetch(SERVER_USER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ identity: userId }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showMessage(data.message || "שגיאה בהוספת המשתמש", "error");
            return;
        }
        
        showMessage("המשתמש נוסף בהצלחה!", "success");
        loadUserList();
    } catch (error) {
        console.error('שגיאה בהוספת המשתמש:', error);
        showMessage("שגיאה בתקשורת עם השרת. אנא נסה שוב מאוחר יותר.", "error");
    }
}

/**
 * פונקציה להסרת משתמש
 * @param {string} userId מספר הזהות של המשתמש להסרה
 */
async function removeUser(userId) {
    if (!confirm("האם אתה בטוח שברצונך להסיר את המשתמש?")) {
        return;
    }
    
    try {
        const response = await fetch(`${SERVER_USER_URL}/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showMessage(data.message || "שגיאה בהסרת המשתמש", "error");
            return;
        }
        
        showMessage("המשתמש הוסר בהצלחה!", "success");
        loadUserList();
    } catch (error) {
        console.error('שגיאה בהסרת המשתמש:', error);
        showMessage("שגיאה בתקשורת עם השרת. אנא נסה שוב מאוחר יותר.", "error");
    }
}