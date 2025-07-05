const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require('path'); // הוסף את מודול 'path'

const app = express();

// הגדרת CORS - חשוב במיוחד אם ה-HTML מוגש מדומיין אחר או מקומית
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// הגשת קובץ ה-HTML הסטטי בכתובת הבסיסית של השרת
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'form.html'));
});

app.post("/submit", (req, res) => {
  const {
    orderId,
    platform,
    username,
    email,
    password
  } = req.body;

  // שימוש במשתני סביבה לאישורים
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "chatbot.playwithbro@gmail.com", // אימייל מהגדרות Render Environment Variables
      pass: "wcmi ksmh vylk ytko"  // סיסמת אפליקציה מהגדרות Render Environment Variables
    }
  });

  const mailOptions = {
    from: "chatbot.playwithbro@gmail.com", // יכול להיות גם אימייל אחר אם תרצה
    to: "service@playwithbro.com",
    subject: `התקבלה הזמנה חדשה - ${orderId}`,
    text: `
📦 מספר הזמנה: ${orderId}
🎮 פלטפורמה: ${platform}
👤 שם משתמש: ${username}
✉️ אימייל: ${email}
🔒 סיסמה: ${password}
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("שגיאה בשליחת המייל:", error);
      // יש לשנות את התשובה כדי שתהיה ידידותית יותר למשתמש ב-frontend
      return res.status(500).send("שגיאה בשליחת ההזמנה. אנא נסה שוב מאוחר יותר.");
    }
    console.log("המייל נשלח:", info.response);
    // יש לשנות את התשובה כדי שתהיה ידידותית יותר למשתמש ב-frontend
    res.status(200).send("ההזמנה נשלחה בהצלחה!");
  });
});

// השרת יאזין לפורט ש-Render יקצה (process.env.PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📡 השרת מאזין בכתובת http://localhost:${PORT}`);
});
