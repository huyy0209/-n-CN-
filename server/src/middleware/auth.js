// Xác thực JWT và phân quyền theo vai trò (quyền gắn với vai trò, không gắn với đơn vị).
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { Loi } = require('../services/common');

const BI_MAT = process.env.JWT_SECRET || 'dev-secret-doi-truoc-khi-dung-that';

const taoToken = (nguoi) => jwt.sign({ MaND: nguoi.MaND }, BI_MAT, { expiresIn: '8h' });

// Bọc handler async để lỗi chuyển về middleware xử lý lỗi
const bat = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Bắt buộc đăng nhập; nạp lại tài khoản từ CSDL để tài khoản bị khóa mất quyền ngay
const dangNhap = bat(async (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) throw new Loi(401, 'Chưa đăng nhập.');
  let duLieu;
  try { duLieu = jwt.verify(token, BI_MAT); } catch { throw new Loi(401, 'Phiên đăng nhập hết hạn, hãy đăng nhập lại.'); }
  const nguoi = await db('NGUOIDUNG as n').leftJoin('DONVI as d', 'd.MaDV', 'n.MaDV').join('VAITRO as v', 'v.MaVaiTro', 'n.MaVaiTro')
    .where({ 'n.MaND': duLieu.MaND }).select('n.MaND', 'n.HoTen', 'n.TenDangNhap', 'n.TrangThaiTK', 'n.MaVaiTro', 'v.TenVaiTro', 'n.MaDV', 'd.TenDV').first();
  if (!nguoi || nguoi.TrangThaiTK !== 'HOAT_DONG') throw new Loi(401, 'Tài khoản không tồn tại hoặc đã bị khóa.');
  req.nguoi = nguoi;
  next();
});

// Chỉ cho các vai trò được liệt kê
const vaiTro = (...ds) => (req, res, next) => {
  if (!ds.includes(req.nguoi.MaVaiTro)) return next(new Loi(403, 'Bạn không có quyền thực hiện chức năng này.'));
  next();
};

module.exports = { taoToken, bat, dangNhap, vaiTro };
