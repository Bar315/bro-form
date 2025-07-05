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
// זה יאפשר לשרת למצוא קבצים כמו 'your-logo.png' ו'form.html'
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
    password
  } = req.body;

  // הגדרת ה-Transporter לשליחת מיילים באמצעות Nodemailer
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // כתובת ה-Gmail שלך (ממשתנה סביבה ב-Render)
      pass: process.env.EMAIL_PASS  // סיסמת האפליקציה (ממשתנה סביבה ב-Render)
    }
  });

  // הגדרת אפשרויות המייל לשליחה
  const mailOptions = {
    from: process.env.EMAIL_USER, // שולח המייל, עדיף להשתמש באותו משתנה סביבה
    to: "service@playwithbro.com", // נמען המייל
    subject: `התקבלה הזמנה חדשה - ${orderId}`, // נושא המייל
    text: `
📦 מספר הזמנה: ${orderId}
🎮 פלטפורמה: ${platform}
👤 שם משתמש: ${username}
✉️ אימייל: ${email}
🔒 סיסמה: ${password}
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
// השרת יאזין לפורט ש-Render יקצה (process.env.PORT), או לפורט 3000 מקומית
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📡 השרת מאזין בכתובת http://localhost:${PORT}`);
});
