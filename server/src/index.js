// Điểm khởi động máy chủ API.
require('dotenv').config();
const app = require('./app');
const { db } = require('./db');
const { nhacHan } = require('./services/ky');

const PORT = Number(process.env.PORT || 4000);

if (!process.env.JWT_SECRET) console.warn('Cảnh báo: chưa đặt JWT_SECRET trong .env, đang dùng khóa mặc định chỉ hợp cho chạy thử.');

app.listen(PORT, () => console.log(`API chạy tại http://localhost:${PORT}`));

// Nhắc hạn tự động (BR15): chạy khi khởi động và mỗi giờ một lần
const chayNhacHan = () => nhacHan(db).catch((e) => console.error('Lỗi nhắc hạn:', e.message));
chayNhacHan();
setInterval(chayNhacHan, 3600 * 1000);
