require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const jwt        = require('jsonwebtoken');
const Database   = require('better-sqlite3');
const fs         = require('fs');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const DB_PATH    = path.join(__dirname, 'data', 'niji.db');
const SUB_JSON   = path.join(__dirname, 'data', 'subscribers.json');
const ADMIN_PWD  = process.env.ADMIN_PASSWORD || 'niji2026';
const JWT_SECRET = process.env.JWT_SECRET     || 'niji-secret-change-me';

// ─── Default content seed ─────────────────────────────────────────────────────
const DEFAULT_CONTENT = {
  hero_headline:   'Nói Nhiều Hơn, Tiến Bộ Nhanh Hơn',
  hero_subtext:    'Niji English là nền tảng học tiếng Anh giao tiếp 1 thầy – 1 trò. Bạn sẽ nói tiếng Anh 70–80% thời gian mỗi buổi học.',
  hero_badge:      'Học 1 kèm 1 · Cá nhân hóa · Linh hoạt',
  about_title:     'Học tiếng Anh 1 kèm 1 – Nói nhiều hơn, tiến bộ nhanh hơn',
  about_desc:      'Niji English là nền tảng học tiếng Anh giao tiếp 1 thầy – 1 trò, nơi mỗi học viên có lộ trình học cá nhân hóa và được luyện nói tiếng Anh nhiều nhất trong mỗi buổi học. Chúng tôi tin rằng cách tốt nhất để giỏi tiếng Anh là nói thật nhiều. Vì vậy, học viên sẽ dành 70–80% thời gian để nói tiếng Anh.',
  contact_phone:   '+84 123 456 789',
  contact_email:   'hello@niji.edu.vn',
  contact_address: 'TP. Hồ Chí Minh, Việt Nam',
  stats: JSON.stringify([
    { value: 1200, suffix: '+',       label: 'Học viên'  },
    { value: 97,   suffix: '%',       label: 'Hài lòng'  },
    { value: 20,   suffix: '+',       label: 'Giáo viên' },
    { value: 5,    suffix: ' cấp độ', label: 'A1 → C1'   },
  ]),
  services: JSON.stringify([
    { icon: 'fa-comments',         title: 'Giao tiếp hằng ngày',     desc: 'Luyện nói tiếng Anh tự nhiên trong các tình huống thực tế: mua sắm, du lịch, gặp gỡ bạn bè và công việc hằng ngày.', featured: false },
    { icon: 'fa-briefcase',        title: 'Tiếng Anh công việc',     desc: 'Tự tin họp hành, viết email, thuyết trình và giao tiếp với đồng nghiệp, khách hàng quốc tế. Phù hợp với người đi làm.', featured: true  },
    { icon: 'fa-microphone-lines', title: 'Phỏng vấn & Thuyết trình', desc: 'Luyện trả lời phỏng vấn, thuyết trình chuyên nghiệp và diễn đạt ý tưởng rõ ràng, tự tin trước đám đông.', featured: false },
  ]),
  features: JSON.stringify([
    { icon: 'fa-user-tie',         color: 'blue',  title: 'Học 1 kèm 1 – Tập trung hoàn toàn vào bạn', desc: 'Không lớp đông, không chờ đợi. Giáo viên tập trung hoàn toàn vào mục tiêu và trình độ của bạn.' },
    { icon: 'fa-map-location-dot', color: 'green', title: 'Lộ trình cá nhân hóa',                      desc: 'Mỗi học viên có một kế hoạch học riêng phù hợp: giao tiếp hằng ngày, tiếng Anh công việc, phỏng vấn, thuyết trình.' },
    { icon: 'fa-comments',         color: 'blue',  title: 'Nói nhiều hơn trong mỗi buổi học',           desc: 'Bạn là người nói nhiều nhất. Giáo viên đặt câu hỏi, sửa phát âm và hướng dẫn cách diễn đạt tự nhiên.' },
    { icon: 'fa-calendar-days',    color: 'green', title: 'Lịch học linh hoạt',                         desc: 'Bạn có thể đặt lịch học phù hợp với thời gian của mình, học ở bất cứ đâu chỉ cần có internet.' },
    { icon: 'fa-spell-check',      color: 'blue',  title: 'Sửa lỗi ngay trong buổi học',               desc: 'Lỗi phát âm, ngữ pháp, từ vựng được sửa ngay lập tức — giúp bạn không lặp lại sai lầm.' },
    { icon: 'fa-bolt',             color: 'green', title: 'Luyện phản xạ giao tiếp',                    desc: 'Tập trả lời nhanh, tự nhiên. Xây dựng phản xạ tiếng Anh thực sự thay vì dịch từ tiếng Việt.' },
  ]),
  testimonials: JSON.stringify([
    { name: 'Nguyễn Thị Lan', title: 'Marketing Manager · FPT Software',      quote: 'Trước đây em cứ nghĩ tiếng Anh của mình quá tệ để học lại. Nhưng sau 2 tháng học 1 kèm 1 tại Niji English, em đã có thể họp bằng tiếng Anh với khách hàng mà không run nữa.', level: 'B2 đạt được', avatar: 'Nguyen+Thi+Lan'  },
    { name: 'Trần Văn Hiếu',  title: 'Software Engineer · Startup Hàn Quốc', quote: 'Mình từng sợ nói tiếng Anh dù học 10 năm. Sau 3 tháng với Niji English, mình đã phỏng vấn thành công vào công ty Hàn Quốc. Phương pháp Practice First thực sự hiệu quả!', level: 'C1 đạt được', avatar: 'Tran+Van+Hieu'   },
    { name: 'Lê Thu Hương',   title: 'B2B Sales Manager · Lazada Vietnam',    quote: 'Mình làm sale B2B, cần tiếng Anh để gặp khách nước ngoài. Học tại Niji English được luyện đúng những gì mình cần, giáo viên sửa từng câu nói trong tình huống thực tế.', level: 'B1 → B2',    avatar: 'Le+Thu+Huong'    },
  ]),
  partners: JSON.stringify(['Microsoft','Google','VNG Corporation','Lazada','Grab','FPT Software','Masan Group','Vingroup']),
};

// ─── Database init ────────────────────────────────────────────────────────────
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS content (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS subscribers (
    email         TEXT PRIMARY KEY,
    subscribed_at TEXT NOT NULL
  );
`);

// Seed default content (INSERT OR IGNORE — won't overwrite existing)
const seedStmt = db.prepare('INSERT OR IGNORE INTO content (key, value) VALUES (?, ?)');
db.transaction(() => { for (const [k, v] of Object.entries(DEFAULT_CONTENT)) seedStmt.run(k, v); })();

// Migrate subscribers.json → SQLite once
if (fs.existsSync(SUB_JSON)) {
  try {
    const list = JSON.parse(fs.readFileSync(SUB_JSON, 'utf8'));
    const insertSub = db.prepare('INSERT OR IGNORE INTO subscribers (email, subscribed_at) VALUES (?, ?)');
    db.transaction(() => list.forEach(s => insertSub.run(s.email, s.subscribedAt)))();
  } catch { /* ignore */ }
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function requireAdmin(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: 'Chưa đăng nhập.' });
  try { jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ success: false, error: 'Token không hợp lệ hoặc đã hết hạn.' }); }
}

// ─── Email transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

// ─── API: Content (public read / admin write) ─────────────────────────────────
app.get('/api/content', (req, res) => {
  const rows    = db.prepare('SELECT key, value FROM content').all();
  const content = {};
  for (const { key, value } of rows) {
    try { content[key] = JSON.parse(value); } catch { content[key] = value; }
  }
  res.json(content);
});

app.put('/api/content', requireAdmin, (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object' || Array.isArray(updates))
    return res.status(400).json({ success: false, error: 'Body phải là object.' });
  const upsert = db.prepare('INSERT OR REPLACE INTO content (key, value) VALUES (?, ?)');
  db.transaction(() => {
    for (const [k, v] of Object.entries(updates))
      upsert.run(k, typeof v === 'string' ? v : JSON.stringify(v));
  })();
  res.json({ success: true, message: 'Đã lưu thành công.' });
});

// ─── API: Admin auth ──────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!password)          return res.status(400).json({ success: false, error: 'Vui lòng nhập mật khẩu.' });
  if (password !== ADMIN_PWD) return res.status(401).json({ success: false, error: 'Mật khẩu không đúng.' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ success: true, token });
});

// ─── API: Subscribers list (admin) ───────────────────────────────────────────
app.get('/api/admin/subscribers', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT email, subscribed_at FROM subscribers ORDER BY subscribed_at DESC').all();
  res.json({ success: true, data: rows, total: rows.length });
});

// ─── API: Newsletter ──────────────────────────────────────────────────────────
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body || {};
  if (!email || !isValidEmail(email))
    return res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
  try {
    db.prepare('INSERT INTO subscribers (email, subscribed_at) VALUES (?, ?)').run(email, new Date().toISOString());
    res.json({ success: true, message: 'Đăng ký thành công! Cảm ơn bạn.' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ success: false, error: 'Email này đã đăng ký rồi.' });
    res.status(500).json({ success: false, error: 'Lỗi server.' });
  }
});

// ─── API: Contact form ────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, goal, message } = req.body || {};
  if (!name || !email || !message)
    return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
  if (!isValidEmail(email))
    return res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: `"Niji English" <${process.env.SMTP_USER}>`,
        to:   process.env.CONTACT_RECEIVER || process.env.SMTP_USER,
        subject: `[Niji English] Liên hệ mới từ ${name}`,
        html: `<h2>Liên hệ mới</h2><table cellpadding="8">
          <tr><td><b>Họ tên:</b></td><td>${name}</td></tr>
          <tr><td><b>Email:</b></td><td>${email}</td></tr>
          <tr><td><b>SĐT:</b></td><td>${phone||'—'}</td></tr>
          <tr><td><b>Mục tiêu:</b></td><td>${goal||'—'}</td></tr>
          <tr><td><b>Tin nhắn:</b></td><td>${message}</td></tr></table>`,
      });
    } else {
      console.log('[Contact]', { name, email, phone, goal, message });
    }
    res.json({ success: true, message: 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất.' });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ success: false, error: 'Gửi thất bại. Vui lòng thử lại sau.' });
  }
});

// ─── Admin panel ──────────────────────────────────────────────────────────────
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ─── Fallback SPA ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Niji English → http://localhost:${PORT}`));
