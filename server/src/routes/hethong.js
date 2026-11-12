// Đăng nhập, thông báo, và nhóm chức năng của Quản trị hệ thống (UC 1.1, 1.3).
const express = require('express');
const bcrypt = require('bcryptjs');
const { db, them } = require('../db');
const { Loi, ghiNhatKy } = require('../services/common');
const { taoToken, bat, dangNhap, vaiTro } = require('../middleware/auth');
const multer = require('multer');
const nhapExcel = require('../services/nhapexcel');

const r = express.Router();

// --- Đăng nhập ---
r.post('/auth/login', bat(async (req, res) => {
  const { TenDangNhap, MatKhau } = req.body || {};
  const nguoi = TenDangNhap ? await db('NGUOIDUNG').where({ TenDangNhap: String(TenDangNhap).trim() }).first() : null;
  // Cùng một thông báo cho sai tên và sai mật khẩu để không lộ tài khoản nào tồn tại
  if (!nguoi || !bcrypt.compareSync(String(MatKhau || ''), nguoi.MatKhau)) throw new Loi(401, 'Sai tên đăng nhập hoặc mật khẩu.');
  if (nguoi.TrangThaiTK !== 'HOAT_DONG') throw new Loi(401, 'Tài khoản đã bị khóa.');
  res.json({ token: taoToken(nguoi) });
}));

r.get('/auth/me', dangNhap, (req, res) => res.json(req.nguoi));

r.post('/auth/doi-mat-khau', dangNhap, bat(async (req, res) => {
  const { MatKhauCu, MatKhauMoi } = req.body || {};
  const nguoi = await db('NGUOIDUNG').where({ MaND: req.nguoi.MaND }).first();
  if (!bcrypt.compareSync(String(MatKhauCu || ''), nguoi.MatKhau)) throw new Loi(422, 'Mật khẩu hiện tại không đúng.');
  if (String(MatKhauMoi || '').length < 6) throw new Loi(422, 'Mật khẩu mới cần ít nhất 6 ký tự.');
  await db('NGUOIDUNG').where({ MaND: nguoi.MaND }).update({ MatKhau: bcrypt.hashSync(String(MatKhauMoi), 10) });
  res.json({ ok: true });
}));

// --- Thông báo trong ứng dụng (BR15) ---
r.get('/thongbao', dangNhap, bat(async (req, res) => {
  const ds = await db('THONGBAO').where({ MaND: req.nguoi.MaND }).orderBy('MaTB', 'desc').limit(50);
  const { n } = await db('THONGBAO').where({ MaND: req.nguoi.MaND, DaDoc: false }).count({ n: '*' }).first();
  res.json({ ChuaDoc: Number(n), DanhSach: ds.map((t) => ({ ...t, DaDoc: !!t.DaDoc, NgayGui: new Date(t.NgayGui) })) });
}));

r.post('/thongbao/doc-tat-ca', dangNhap, bat(async (req, res) => {
  await db('THONGBAO').where({ MaND: req.nguoi.MaND, DaDoc: false }).update({ DaDoc: true });
  res.json({ ok: true });
}));

// --- UC 1.1 Quản lý tài khoản và phân quyền ---
const quanTri = [dangNhap, vaiTro('QUAN_TRI')];

r.get('/vaitro', dangNhap, bat(async (req, res) => res.json(await db('VAITRO'))));

r.get('/nguoidung', quanTri, bat(async (req, res) => {
  res.json(await db('NGUOIDUNG as n').leftJoin('DONVI as d', 'd.MaDV', 'n.MaDV').join('VAITRO as v', 'v.MaVaiTro', 'n.MaVaiTro')
    .select('n.MaND', 'n.HoTen', 'n.TenDangNhap', 'n.Email', 'n.SDT', 'n.TrangThaiTK', 'n.MaVaiTro', 'v.TenVaiTro', 'n.MaDV', 'd.TenDV').orderBy('n.MaND'));
}));

// Kiểm tra vai trò, đơn vị hợp lệ; đầu mối và chuyên viên thẩm định bắt buộc gắn đơn vị (RB14, RB15)
async function kiemTraTaiKhoan(d) {
  if (!d.HoTen || !String(d.HoTen).trim()) throw new Loi(422, 'Thiếu họ tên.');
  if (!(await db('VAITRO').where({ MaVaiTro: d.MaVaiTro }).first())) throw new Loi(422, 'Vai trò không hợp lệ.');
  if (d.MaDV && !(await db('DONVI').where({ MaDV: d.MaDV }).first())) throw new Loi(422, 'Đơn vị không tồn tại.');
  if (['DAU_MOI', 'THAM_DINH'].includes(d.MaVaiTro) && !d.MaDV) throw new Loi(422, 'Cán bộ đầu mối và chuyên viên thẩm định phải thuộc một đơn vị.');
}

r.post('/nguoidung', quanTri, bat(async (req, res) => {
  const d = req.body || {};
  await kiemTraTaiKhoan(d);
  const ten = String(d.TenDangNhap || '').trim();
  if (!/^[a-zA-Z0-9_.]{3,50}$/.test(ten)) throw new Loi(422, 'Tên đăng nhập gồm 3-50 ký tự chữ, số, dấu gạch dưới hoặc dấu chấm.');
  if (String(d.MatKhau || '').length < 6) throw new Loi(422, 'Mật khẩu cần ít nhất 6 ký tự.');
  if (await db('NGUOIDUNG').where({ TenDangNhap: ten }).first()) throw new Loi(409, 'Tên đăng nhập đã tồn tại.');
  const MaND = await them(db, 'NGUOIDUNG', {
    HoTen: String(d.HoTen).trim(), TenDangNhap: ten, MatKhau: bcrypt.hashSync(String(d.MatKhau), 10), Email: d.Email || null, SDT: d.SDT || null,
    TrangThaiTK: 'HOAT_DONG', MaVaiTro: d.MaVaiTro, MaDV: d.MaDV || null,
  }, 'MaND');
  await ghiNhatKy(db, req.nguoi.MaND, 'TAO_TAI_KHOAN', `Tài khoản ${ten} (${d.MaVaiTro})`);
  res.status(201).json({ MaND });
}));

// Sửa thông tin, gán vai trò/đơn vị, khóa/mở, đặt lại mật khẩu. Tài khoản không xóa, chỉ khóa (BR24).
r.put('/nguoidung/:id', quanTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  const cu = await db('NGUOIDUNG').where({ MaND: id }).first();
  if (!cu) throw new Loi(404, 'Không tìm thấy tài khoản.');
  const d = { HoTen: cu.HoTen, MaVaiTro: cu.MaVaiTro, MaDV: cu.MaDV, ...req.body };
  await kiemTraTaiKhoan(d);
  const tt = d.TrangThaiTK === 'KHOA' ? 'KHOA' : 'HOAT_DONG';
  if (id === req.nguoi.MaND && (tt === 'KHOA' || d.MaVaiTro !== 'QUAN_TRI')) throw new Loi(422, 'Không tự khóa hoặc tự bỏ quyền quản trị của chính mình.');
  const capNhat = { HoTen: String(d.HoTen).trim(), Email: d.Email ?? cu.Email, SDT: d.SDT ?? cu.SDT, MaVaiTro: d.MaVaiTro, MaDV: d.MaDV || null, TrangThaiTK: tt };
  if (d.MatKhau) {
    if (String(d.MatKhau).length < 6) throw new Loi(422, 'Mật khẩu cần ít nhất 6 ký tự.');
    capNhat.MatKhau = bcrypt.hashSync(String(d.MatKhau), 10);
  }
  await db('NGUOIDUNG').where({ MaND: id }).update(capNhat);
  const thayDoi = [cu.MaVaiTro !== capNhat.MaVaiTro && `vai trò ${cu.MaVaiTro} -> ${capNhat.MaVaiTro}`, cu.TrangThaiTK !== tt && (tt === 'KHOA' ? 'khóa' : 'mở khóa'), d.MatKhau && 'đặt lại mật khẩu'].filter(Boolean);
  if (thayDoi.length) await ghiNhatKy(db, req.nguoi.MaND, 'SUA_TAI_KHOAN', `Tài khoản ${cu.TenDangNhap}: ${thayDoi.join(', ')}`);
  res.json({ ok: true });
}));

// --- UC 1.2 Nhập tài khoản bằng Excel ---
const LOAI_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

r.get('/nguoidung-excel/mau', quanTri, bat(async (req, res) => {
  res.setHeader('Content-Type', LOAI_XLSX);
  res.setHeader('Content-Disposition', 'attachment; filename="mau-nhap-tai-khoan.xlsx"');
  res.send(await nhapExcel.taoTepMau(db));
}));

// Tệp đọc thẳng từ bộ nhớ, không lưu xuống đĩa; giới hạn 2 MB
const taiExcel = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }).single('tep');
r.post('/nguoidung-excel', quanTri, (req, res, next) => {
  taiExcel(req, res, (e) => next(e instanceof multer.MulterError ? new Loi(422, 'Tệp vượt quá 2 MB hoặc tải lên thất bại.') : e));
}, bat(async (req, res) => {
  if (!req.file) throw new Loi(422, 'Chưa chọn tệp.');
  if (!/\.xlsx$/i.test(req.file.originalname)) throw new Loi(422, 'Chỉ nhận tệp .xlsx theo mẫu.');
  res.json(await nhapExcel.nhapTuExcel(db, req.file.buffer, req.nguoi));
}));

// --- UC 1.3 Xem nhật ký (chỉ đọc - BR20) ---
r.get('/nhatky', quanTri, bat(async (req, res) => {
  const q = db('NHATKY as k').join('NGUOIDUNG as n', 'n.MaND', 'k.MaND').select('k.*', 'n.HoTen', 'n.TenDangNhap').orderBy('k.MaNK', 'desc').limit(300);
  if (req.query.hanhDong) q.where({ 'k.HanhDong': String(req.query.hanhDong) });
  if (req.query.tu) q.where('k.DoiTuong', 'like', `%${String(req.query.tu)}%`);
  res.json((await q).map((x) => ({ ...x, ThoiGian: new Date(x.ThoiGian) })));
}));

module.exports = r;
