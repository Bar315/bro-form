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
    // --- SECURITY UPGRADE: Encrypt the password ---
    const encryptedPassword = encrypt(password);
    
    userDetailsText = `
👤 שם משתמש: ${username}
🔒 סיסמה (מוצפנת): ${encryptedPassword}
✉️ אימייל ליצירת קשר: ${email}

(הערה: הסיסמה הוצפנה. השתמשו בסקריפט הפענוח עם מפתח ההצפנה כדי לחשוף אותה.)
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
