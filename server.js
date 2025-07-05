const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require('path'); // ודא שזה קיים

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// השורה המתוקנת:
// הגשת קבצים סטטיים מהתיקייה שבה נמצא קובץ server.js
app.use(express.static(path.join(__dirname, '')));


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

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "chatbot.playwithbro@gmail.com",
      pass: "wcmi ksmh vylk ytko"
    }
  });

  const mailOptions = {
    from: "chatbot.playwithbro@gmail.com",
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
      return res.status(500).send("שגיאה בשליחת ההזמנה. אנא נסה שוב מאוחר יותר.");
    }
    console.log("המייל נשלח:", info.response);
    res.status(200).send("ההזמנה נשלחה בהצלחה!");
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📡 השרת מאזין בכתובת http://localhost:${PORT}`);
});
