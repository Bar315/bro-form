require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require('path');
const crypto = require('crypto');

// --- Encryption Setup ---
// To create a secure key, run this in Node.js: console.log(crypto.randomBytes(32).toString('hex'));
// and add it to your .env file as ENCRYPTION_KEY
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error("FATAL ERROR: ENCRYPTION_KEY is not defined or not 64 characters long in .env file.");
    process.exit(1); // Stop the server if the key is missing or invalid
}

const key = Buffer.from(ENCRYPTION_KEY, 'hex');

function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/* 
// --- How to Decrypt for Your Team ---
// You can create a simple standalone Node.js script (e.g., decrypt.js) to decrypt the password when needed.
// Do NOT include this decryption logic in the public-facing server.
//
// To use, run from your terminal: node decrypt.js <encrypted_password_string>
//
// --- decrypt.js content ---
// require('dotenv').config();
// const crypto = require('crypto');
//
// const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
// const key = Buffer.from(ENCRYPTION_KEY, 'hex');
// const IV_LENGTH = 16;
//
// function decrypt(text) {
//     try {
//         const textParts = text.split(':');
//         const iv = Buffer.from(textParts.shift(), 'hex');
//         const encryptedText = Buffer.from(textParts.join(':'), 'hex');
//         const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
//         let decrypted = decipher.update(encryptedText);
//         decrypted = Buffer.concat([decrypted, decipher.final()]);
//         return decrypted.toString();
//     } catch (error) {
//         console.error("Decryption failed. The encrypted string may be malformed or the key incorrect.");
//         return null;
//     }
// }
//
// const encryptedPassword = process.argv[2];
// if (!encryptedPassword) {
//     console.log("Usage: node decrypt.js <encrypted_password>");
// } else {
//     const decryptedPassword = decrypt(encryptedPassword);
//     if (decryptedPassword) {
//         console.log('Decrypted Password:', decryptedPassword);
//     }
// }
// --- end of decrypt.js ---
*/


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
    createAccount
  } = req.body;

  // --- NEW: Server-side validation ---
  if (!orderId || !platform || !email) {
    return res.status(400).send("שדות חובה חסרים. אנא מלא את מספר ההזמנה, הפלטפורמה והאימייל.");
  }

  // If not creating a new account, username and password are required
  if (!createAccount && (!username || !password)) {
    return res.status(400).send("שם המשתמש והסיסמה נדרשים כאשר לא יוצרים חשבון חדש.");
  }

  // Basic email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).send("כתובת האימייל שהוזנה אינה תקינה.");
  }

  // הגדרת ה-Transporter לשליחת מיילים באמצעות Nodemailer
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // כתובת ה-Gmail שלך (ממשתנה סביבה ב-Render)
      pass: process.env.EMAIL_PASS  // סיסמת האפליקציה (ממשתנה סביבה ב-Render)
    }
  });

  // --- NEW: Conditionally build the HTML details part of the email ---
  let userDetailsHtml;
  if (createAccount) {
    userDetailsHtml = `
    <div class="special-request">
        <p>❗️ בקשה ליצירת חשבון חדש ❗️</p>
    </div>
    `;
  } else {
    const encryptedPassword = encrypt(password);
    userDetailsHtml = `
    <div class="credentials-box">
        <dl class="info-grid">
            <dt>שם משתמש:</dt>
            <dd>${username}</dd>
            <dt>סיסמה (מוצפנת):</dt>
            <dd>${encryptedPassword}</dd>
        </dl>
    </div>
    `;
  }

  // --- NEW: Beautiful HTML Email Template ---
  const emailHtml = `
  <!DOCTYPE html>
  <html lang="he" dir="rtl">
  <head>
      <meta charset="UTF-8">
      <style>
          body { font-family: 'Assistant', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background-color: #3b82f6; color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .content { padding: 32px; }
          .content h2 { font-size: 22px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-top: 0; margin-bottom: 20px; }
          .info-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 12px 20px; align-items: center; margin-bottom: 24px; }
          .info-grid dt { font-weight: 600; color: #475569; }
          .info-grid dd { margin: 0; color: #1e293b; font-size: 16px; }
          .credentials-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
          .credentials-box dt { font-size: 14px; }
          .credentials-box dd { font-size: 18px; font-weight: 600; font-family: 'Courier New', Courier, monospace; background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px; word-break: break-all; }
          .special-request { background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; text-align: center; }
          .special-request p { margin: 0; font-size: 18px; font-weight: 600; color: #b45309; }
          .footer { background-color: #f1f5f9; text-align: center; padding: 20px; font-size: 12px; color: #64748b; }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>התקבלה הזמנה חדשה</h1>
          </div>
          <div class="content">
              <h2>פרטי הזמנה</h2>
              <dl class="info-grid">
                  <dt>מספר הזמנה:</dt>
                  <dd>${orderId}</dd>
                  <dt>פלטפורמה:</dt>
                  <dd>${platform}</dd>
                  <dt>אימייל לקוח:</dt>
                  <dd>${email}</dd>
              </dl>

              <h2>פרטי התחברות</h2>
              ${userDetailsHtml}
          </div>
          <div class="footer">
              נשלח אוטומטית ממערכת טופס ההזמנות
          </div>
      </div>
  </body>
  </html>
  `;

  // הגדרת אפשרויות המייל לשליחה
  const mailOptions = {
    from: `"BRO Orders" <${process.env.EMAIL_USER}>`,
    to: "service@playwithbro.com",
    subject: `הזמנה #${orderId} - ${platform}`,
    html: emailHtml
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
