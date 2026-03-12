require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const jwt        = require('jsonwebtoken');
const fs         = require('fs');
const path       = require('path');

const app        = express();
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tec-secret-change-me';

// Vercel: dùng /tmp (writable), local: dùng data/
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const CONTENT_FILE     = path.join(DATA_DIR, 'content.json');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');
const CONTACTS_FILE    = path.join(DATA_DIR, 'contacts.json');
const CONFIG_FILE      = path.join(DATA_DIR, 'config.json');

// ─── Config (password) ────────────────────────────────────────────────────────
function readConfig() {
  return readJSON(CONFIG_FILE, { adminPassword: process.env.ADMIN_PASSWORD || 'niji2026' });
}
function getAdminPassword() { return readConfig().adminPassword; }

// ─── Default content ──────────────────────────────────────────────────────────
const DEFAULT_CONTENT = {
  hero_headline:   'Nói Nhiều Hơn, Tiến Bộ Nhanh Hơn',
  hero_subtext:    'TEC English là nền tảng học tiếng Anh giao tiếp 1 thầy – 1 trò. Bạn sẽ nói tiếng Anh 70–80% thời gian mỗi buổi học.',
  hero_badge:      'Học 1 kèm 1 · Cá nhân hóa · Linh hoạt',
  about_title:     'Học tiếng Anh 1 kèm 1 – Nói nhiều hơn, tiến bộ nhanh hơn',
  about_desc:      'TEC English là nền tảng học tiếng Anh giao tiếp 1 thầy – 1 trò, nơi mỗi học viên có lộ trình học cá nhân hóa và được luyện nói tiếng Anh nhiều nhất trong mỗi buổi học. Chúng tôi tin rằng cách tốt nhất để giỏi tiếng Anh là nói thật nhiều. Vì vậy, học viên sẽ dành 70–80% thời gian để nói tiếng Anh.',
  contact_phone:   '+84 123 456 789',
  contact_email:   'hello@tec.edu.vn',
  contact_address: 'TP. Hồ Chí Minh, Việt Nam',
  stats: [
    { value: 1200, suffix: '+',       label: 'Học viên'  },
    { value: 97,   suffix: '%',       label: 'Hài lòng'  },
    { value: 20,   suffix: '+',       label: 'Giáo viên' },
    { value: 5,    suffix: ' cấp độ', label: 'A1 → C1'   },
  ],
  services: [
    { icon: 'fa-comments',         title: 'Giao tiếp hằng ngày',      desc: 'Luyện nói tiếng Anh tự nhiên trong các tình huống thực tế: mua sắm, du lịch, gặp gỡ bạn bè và công việc hằng ngày.', featured: false },
    { icon: 'fa-briefcase',        title: 'Tiếng Anh công việc',      desc: 'Tự tin họp hành, viết email, thuyết trình và giao tiếp với đồng nghiệp, khách hàng quốc tế. Phù hợp với người đi làm.', featured: true  },
    { icon: 'fa-microphone-lines', title: 'Phỏng vấn & Thuyết trình', desc: 'Luyện trả lời phỏng vấn, thuyết trình chuyên nghiệp và diễn đạt ý tưởng rõ ràng, tự tin trước đám đông.', featured: false },
  ],
  features: [
    { icon: 'fa-user-tie',         color: 'blue',  title: 'Học 1 kèm 1 – Tập trung hoàn toàn vào bạn', desc: 'Không lớp đông, không chờ đợi. Giáo viên tập trung hoàn toàn vào mục tiêu và trình độ của bạn.' },
    { icon: 'fa-map-location-dot', color: 'green', title: 'Lộ trình cá nhân hóa',                      desc: 'Mỗi học viên có một kế hoạch học riêng phù hợp: giao tiếp hằng ngày, tiếng Anh công việc, phỏng vấn, thuyết trình.' },
    { icon: 'fa-comments',         color: 'blue',  title: 'Nói nhiều hơn trong mỗi buổi học',           desc: 'Bạn là người nói nhiều nhất. Giáo viên đặt câu hỏi, sửa phát âm và hướng dẫn cách diễn đạt tự nhiên.' },
    { icon: 'fa-calendar-days',    color: 'green', title: 'Lịch học linh hoạt',                         desc: 'Bạn có thể đặt lịch học phù hợp với thời gian của mình, học ở bất cứ đâu chỉ cần có internet.' },
    { icon: 'fa-spell-check',      color: 'blue',  title: 'Sửa lỗi ngay trong buổi học',               desc: 'Lỗi phát âm, ngữ pháp, từ vựng được sửa ngay lập tức — giúp bạn không lặp lại sai lầm.' },
    { icon: 'fa-bolt',             color: 'green', title: 'Luyện phản xạ giao tiếp',                    desc: 'Tập trả lời nhanh, tự nhiên. Xây dựng phản xạ tiếng Anh thực sự thay vì dịch từ tiếng Việt.' },
  ],
  testimonials: [
    { name: 'Nguyễn Thị Lan', title: 'Marketing Manager · FPT Software',      quote: 'Trước đây em cứ nghĩ tiếng Anh của mình quá tệ để học lại. Nhưng sau 2 tháng học 1 kèm 1 tại TEC English, em đã có thể họp bằng tiếng Anh với khách hàng mà không run nữa.', level: 'B2 đạt được', avatar: 'Nguyen+Thi+Lan'  },
    { name: 'Trần Văn Hiếu',  title: 'Software Engineer · Startup Hàn Quốc', quote: 'Mình từng sợ nói tiếng Anh dù học 10 năm. Sau 3 tháng với TEC English, mình đã phỏng vấn thành công vào công ty Hàn Quốc. Phương pháp Practice First thực sự hiệu quả!', level: 'C1 đạt được', avatar: 'Tran+Van+Hieu'   },
    { name: 'Lê Thu Hương',   title: 'B2B Sales Manager · Lazada Vietnam',    quote: 'Mình làm sale B2B, cần tiếng Anh để gặp khách nước ngoài. Học tại TEC English được luyện đúng những gì mình cần, giáo viên sửa từng câu nói trong tình huống thực tế.', level: 'B1 → B2',    avatar: 'Le+Thu+Huong'    },
  ],
  partners: ['Microsoft','Google','VNG Corporation','Lazada','Grab','FPT Software','Masan Group','Vingroup'],
  gallery: [
    { src: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80', caption: 'Buổi học 1 kèm 1 online',        alt: 'Lớp học online' },
    { src: 'https://images.unsplash.com/photo-1543269664-76bc3997d9ea?w=600&q=80', caption: 'Workshop Speaking',               alt: 'Workshop tiếng Anh' },
    { src: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=600&q=80', caption: 'English Club hằng tuần',          alt: 'English Club' },
    { src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80', caption: 'Học trực tuyến mọi lúc',          alt: 'Học online' },
    { src: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80', caption: 'Đào tạo tiếng Anh doanh nghiệp', alt: 'Business English' },
    { src: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&q=80', caption: 'Lễ tốt nghiệp khóa học',          alt: 'Graduation' },
  ],
};

// ─── JSON file helpers ────────────────────────────────────────────────────────
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Init data files on startup ───────────────────────────────────────────────
// Content: seed defaults if file doesn't exist or missing keys
const storedContent = readJSON(CONTENT_FILE, {});
const content = { ...DEFAULT_CONTENT, ...storedContent };
writeJSON(CONTENT_FILE, content);

// Subscribers: migrate from legacy subscribers.json if needed
const LEGACY_SUB = path.join(__dirname, 'data', 'subscribers.json');
if (!fs.existsSync(SUBSCRIBERS_FILE)) {
  if (fs.existsSync(LEGACY_SUB)) {
    try {
      const legacy = JSON.parse(fs.readFileSync(LEGACY_SUB, 'utf8'));
      const migrated = legacy.map(s => ({ email: s.email, subscribed_at: s.subscribedAt || s.subscribed_at }));
      writeJSON(SUBSCRIBERS_FILE, migrated);
    } catch { writeJSON(SUBSCRIBERS_FILE, []); }
  } else {
    writeJSON(SUBSCRIBERS_FILE, []);
  }
}

// Contacts: init empty if not exists
if (!fs.existsSync(CONTACTS_FILE)) writeJSON(CONTACTS_FILE, []);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
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

// ─── API: Content ─────────────────────────────────────────────────────────────
app.get('/api/content', (req, res) => {
  res.json(readJSON(CONTENT_FILE, DEFAULT_CONTENT));
});

app.put('/api/content', requireAdmin, (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object' || Array.isArray(updates))
    return res.status(400).json({ success: false, error: 'Body phải là object.' });
  const current = readJSON(CONTENT_FILE, DEFAULT_CONTENT);
  writeJSON(CONTENT_FILE, { ...current, ...updates });
  res.json({ success: true, message: 'Đã lưu thành công.' });
});

// ─── API: Admin auth ──────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!password)                        return res.status(400).json({ success: false, error: 'Vui lòng nhập mật khẩu.' });
  if (password !== getAdminPassword())  return res.status(401).json({ success: false, error: 'Mật khẩu không đúng.' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ success: true, token });
});

// ─── API: Change password ─────────────────────────────────────────────────────
app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword)
    return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ thông tin.' });
  if (newPassword.length < 6)
    return res.status(400).json({ success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
  if (currentPassword !== getAdminPassword())
    return res.status(401).json({ success: false, error: 'Mật khẩu hiện tại không đúng.' });
  const cfg = readConfig();
  writeJSON(CONFIG_FILE, { ...cfg, adminPassword: newPassword });
  res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
});

// ─── API: Upload image (base64, lưu vào content) ─────────────────────────────
app.post('/api/admin/upload-image', requireAdmin, (req, res) => {
  const { key, data } = req.body || {};
  if (!key || !data)
    return res.status(400).json({ success: false, error: 'Thiếu key hoặc data.' });
  if (!data.startsWith('data:image/'))
    return res.status(400).json({ success: false, error: 'Dữ liệu không phải ảnh.' });
  // Giới hạn 2MB (base64 ~2.7MB raw)
  if (data.length > 2_800_000)
    return res.status(413).json({ success: false, error: 'Ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB.' });
  const current = readJSON(CONTENT_FILE, DEFAULT_CONTENT);
  writeJSON(CONTENT_FILE, { ...current, [key]: data });
  res.json({ success: true, message: 'Tải ảnh thành công!', key });
});

// ─── API: Subscribers ─────────────────────────────────────────────────────────
app.get('/api/admin/subscribers', requireAdmin, (req, res) => {
  const data = readJSON(SUBSCRIBERS_FILE, []);
  res.json({ success: true, data, total: data.length });
});

app.post('/api/newsletter', (req, res) => {
  const { email } = req.body || {};
  if (!email || !isValidEmail(email))
    return res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
  const list = readJSON(SUBSCRIBERS_FILE, []);
  if (list.find(s => s.email === email))
    return res.status(409).json({ success: false, error: 'Email này đã đăng ký rồi.' });
  list.push({ email, subscribed_at: new Date().toISOString() });
  writeJSON(SUBSCRIBERS_FILE, list);
  res.json({ success: true, message: 'Đăng ký thành công! Cảm ơn bạn.' });
});

// ─── API: Contact form ────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, goal, message } = req.body || {};
  if (!name || !email || !message)
    return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
  if (!isValidEmail(email))
    return res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
  try {
    // Lưu vào file trước
    const contacts = readJSON(CONTACTS_FILE, []);
    contacts.unshift({ id: Date.now(), name, email, phone: phone || null, goal: goal || null, message, created_at: new Date().toISOString() });
    writeJSON(CONTACTS_FILE, contacts);
    // Gửi email nếu đã cấu hình SMTP
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter.sendMail({
        from: `"TEC English" <${process.env.SMTP_USER}>`,
        to:   process.env.CONTACT_RECEIVER || process.env.SMTP_USER,
        subject: `[TEC English] Liên hệ mới từ ${name}`,
        html: `<h2>Liên hệ mới</h2><table cellpadding="8">
          <tr><td><b>Họ tên:</b></td><td>${name}</td></tr>
          <tr><td><b>Email:</b></td><td>${email}</td></tr>
          <tr><td><b>SĐT:</b></td><td>${phone||'—'}</td></tr>
          <tr><td><b>Mục tiêu:</b></td><td>${goal||'—'}</td></tr>
          <tr><td><b>Tin nhắn:</b></td><td>${message}</td></tr></table>`,
      }).catch(err => console.error('Mail error:', err.message));
    }
    res.json({ success: true, message: 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất.' });
  } catch (err) {
    console.error('Contact error:', err.message);
    res.status(500).json({ success: false, error: 'Gửi thất bại. Vui lòng thử lại sau.' });
  }
});

// ─── API: Contacts list (admin) ───────────────────────────────────────────────
app.get('/api/admin/contacts', requireAdmin, (req, res) => {
  const data = readJSON(CONTACTS_FILE, []);
  res.json({ success: true, total: data.length, data });
});

// ─── Admin panel ──────────────────────────────────────────────────────────────
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ─── Fallback SPA ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`TEC English → http://localhost:${PORT}`));
