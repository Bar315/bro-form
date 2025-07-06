const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// הגשת קבצים סטטיים מהתיקייה שבה נמצא קובץ server.js
app.use(express.static(path.join(__dirname, '')));

// נתיב ה-GET עבור הטופס הראשי
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'form.html'));
});

// נתיב ה-POST לקבלת נתוני הטופס ושליחת המייל
app.post("/submit", (req, res) => {
  const {
    orderId,
    platform,
    username,
    email,
    password,
    createAccount // משתנה חדש מתיבת הסימון
  } = req.body;

  // הגדרת ה-Transporter לשליחת מיילים באמצעות Nodemailer
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // כתובת ה-Gmail שלך (ממשתנה סביבה ב-Render)
      pass: process.env.EMAIL_PASS  // סיסמת האפליקציה (ממשתנה סביבה ב-Render)
    }
  });

  // --- NEW: Conditionally build the details part of the email ---
  let userDetailsText;
  if (createAccount) {
    // אם הלקוח ביקש לפתוח משתמש חדש
    userDetailsText = `
❗️ בקשה לפתיחת חשבון חדש ❗️
יש ליצור עבור הלקוח חשבון חדש בפלטפורמה.
אימייל לקישור החשבון: ${email}
    `;
  } else {
    // אם הלקוח סיפק פרטי התחברות קיימים
    userDetailsText = `
👤 שם משתמש: ${username}
🔒 סיסמה: ${password}
✉️ אימייל ליצירת קשר: ${email}
    `;
  }

  // הגדרת אפשרויות המייל לשליחה
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "service@playwithbro.com",
    subject: `התקבלה הזמנה ${orderId} - ${createAccount ? 'עם בקשה ליצירת משתמש' : 'התקנה רגילה'}`,
    text: `
פרטי הזמנה חדשה שהתקבלה דרך טופס ההתקנה האוטומטית:
----------------------------------------------------

📦 מספר הזמנה: ${orderId}
🎮 פלטפורמה: ${platform}

--- פרטי התחברות ---
${userDetailsText}
----------------------------------------------------
    `
  };

  // שליחת המייל
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("שגיאה בשליחת המייל:", error);
      return res.status(500).send("שגיאה בשליחת ההזמנה. אנא נסה שוב מאוחר יותר.");
    }
    console.log("המייל נשלח:", info.response);
    res.status(200).send("ההזמנה נשלחה בהצלחה!");
  });
});

// הגדרת הפורט להאזנה
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📡 השרת מאזין בכתובת http://localhost:${PORT}`);
});
