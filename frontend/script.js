let userIdList = [];
const validUserCode = "0001"; // הקוד התקין למשתמשים רגילים
const validAdminCode = "0002"; // הקוד התקין למנהלים

function loginUser() {
    const userId = document.getElementById('userId').value;
    const userCode = document.getElementById('userCode').value;
    
    user = { id: userId, code: userCode };
    if (userId === "" || userCode === "") {
        alert("אנא מלא את כל השדות.");
        return;
    }
    fetch('http://localhost:3000/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
    })
    .then(response => response.json())
    .then(data => {
        if(data.message === "User not found") {
            alert("משתמש לא נמצא");
        } else if(data.message === "User found") {
            alert("הכניסה התבצעה בהצלחה");
            window.location.href = 'https://github.com/ahronSteinbruch/KeyLogger';
    }}).catch((error) => {
        console.error('Error:', error);
    });
    if (!/^\d{9}$/.test(userId)) {
        alert("מספר הזהות חייב לכלול 9 ספרות.");
        return;
    }

    if (userCode === validUserCode) {
        alert("הקוד תקין! מעבר לדף הבא...");
        const currentTime = new Date().toLocaleTimeString(); // שמירת שעת הכניסה
        userIdList.push({ id: userId, time: currentTime });
        window.location.href = 'https://github.com/ahronSteinbruch/KeyLogger';
    } else {
        alert("הקוד אינו תקין, נסה שנית.");
    }
}

function showAdminSection() {
    const adminCode = prompt("אנא הזן את קוד המנהל:");

    if (adminCode === validAdminCode) {
        document.getElementById('adminSection').style.display = 'block';
        const userListElement = document.getElementById('userList');
        userListElement.innerHTML = '';
        userIdList.forEach((user, index) => {
            userListElement.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${user.id}</td>
                    <td>${user.time}</td>
                </tr>`;
        });
    } else {
        alert("קוד המנהל אינו תקין.");
    }
}

function downloadUserList() {
    let userListText = 'מספר משתמש,מספר זהות,שעת כניסה\n';
    userIdList.forEach((user, index) => {
        userListText += `${index + 1},${user.id},${user.time}\n`;
    });

    const blob = new Blob([userListText], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_list.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
