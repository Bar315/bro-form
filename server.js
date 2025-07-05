const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

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
      user: "chatbot.playwithbro@gmail.com",       // כתובת Gmail שלך
      pass: "wcmi ksmh vylk ytko"           // סיסמת אפליקציה (לא סיסמה רגילה)
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
      return res.status(500).send("שגיאה בשליחה");
    }
    console.log("המייל נשלח:", info.response);
    res.send("ההזמנה נשלחה בהצלחה!");
  });
});

app.listen(3000, () => {
  console.log("📡 השרת מאזין בכתובת http://localhost:3000");
});
