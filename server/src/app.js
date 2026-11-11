// Khởi tạo ứng dụng Express: gắn route, phục vụ giao diện đã build, xử lý lỗi chung.
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Loi } = require('./services/common');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', require('./routes/hethong'));
app.use('/api', require('./routes/danhmuc'));
app.use('/api', require('./routes/nghiepvu'));
app.use('/api', (req, res) => res.status(404).json({ message: 'Không tìm thấy API.' }));

// Nếu đã build giao diện (client/dist) thì phục vụ luôn từ máy chủ này
const thuMucGiaoDien = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(thuMucGiaoDien)) {
  app.use(express.static(thuMucGiaoDien));
  app.get('*', (req, res) => res.sendFile(path.join(thuMucGiaoDien, 'index.html')));
}

// Lỗi nghiệp vụ trả đúng mã và thông báo; lỗi khác ghi log, không lộ chi tiết ra ngoài
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof Loi) return res.status(err.status).json({ message: err.message, chiTiet: err.chiTiet });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Dữ liệu gửi lên không hợp lệ.' });
  console.error(err);
  res.status(500).json({ message: 'Lỗi máy chủ. Hãy thử lại.' });
});

module.exports = app;
