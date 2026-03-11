require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SUBSCRIBERS_FILE = path.join(__dirname, 'data', 'subscribers.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Email transporter ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// --- Helpers ---
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readSubscribers() {
  try {
    return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeSubscribers(list) {
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

// --- POST /api/contact ---
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, goal, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
  }

  const mailOptions = {
    from: `"121 English Website" <${process.env.SMTP_USER}>`,
    to: process.env.CONTACT_RECEIVER || process.env.SMTP_USER,
    subject: `[121 English] Liên hệ mới từ ${name}`,
    html: `
      <h2>Liên hệ mới từ website 121 English</h2>
      <table cellpadding="8" style="border-collapse:collapse">
        <tr><td><strong>Họ tên:</strong></td><td>${name}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
        <tr><td><strong>Số điện thoại:</strong></td><td>${phone || '(không cung cấp)'}</td></tr>
        <tr><td><strong>Mục tiêu:</strong></td><td>${goal || '(không cung cấp)'}</td></tr>
        <tr><td><strong>Tin nhắn:</strong></td><td>${message}</td></tr>
      </table>
    `,
  };

  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
    } else {
      // Log to console when SMTP not configured
      console.log('[Contact Form]', { name, email, phone, goal, message });
    }
    res.json({ success: true, message: 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất.' });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ success: false, error: 'Gửi thất bại. Vui lòng thử lại sau.' });
  }
});

// --- POST /api/newsletter ---
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
  }

  const list = readSubscribers();
  if (list.find((s) => s.email === email)) {
    return res.status(409).json({ success: false, error: 'Email này đã đăng ký rồi.' });
  }

  list.push({ email, subscribedAt: new Date().toISOString() });
  writeSubscribers(list);

  res.json({ success: true, message: 'Đăng ký thành công! Cảm ơn bạn.' });
});

// --- Serve index.html for all other routes ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`121 English server running at http://localhost:${PORT}`);
});
