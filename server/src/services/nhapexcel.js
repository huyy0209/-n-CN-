// Use Case 1.2 - Nhập tài khoản bằng Excel: tệp mẫu và xử lý từng dòng.
// Dòng hợp lệ được tạo; dòng lỗi (trùng tên đăng nhập, sai vai trò, sai mã đơn vị...) bị bỏ qua và liệt kê lại.
const ExcelJS = require('exceljs');
const bcrypt = require('bcryptjs');
const { them } = require('../db');
const { Loi, ghiNhatKy } = require('./common');

const COT = ['HoTen', 'TenDangNhap', 'MatKhau', 'MaVaiTro', 'MaDV', 'Email', 'SDT'];
const TIEU_DE = ['Họ tên (*)', 'Tên đăng nhập (*)', 'Mật khẩu (*)', 'Mã vai trò (*)', 'Mã đơn vị', 'Email', 'Số điện thoại'];
const SO_DONG_TOI_DA = 500;

// Tệp mẫu: sheet nhập liệu + sheet danh mục mã vai trò, mã đơn vị hiện có
async function taoTepMau(trx) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('TaiKhoan');
  ws.columns = [{ width: 28 }, { width: 20 }, { width: 16 }, { width: 16 }, { width: 12 }, { width: 28 }, { width: 16 }];
  ws.addRow(TIEU_DE);
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.addRow(['Nguyễn Văn Mẫu', 'dm_mau', 'matkhau123', 'DAU_MOI', 1, 'mau@example.gov.vn', '']);
  const dm = wb.addWorksheet('DanhMuc');
  dm.columns = [{ width: 16 }, { width: 34 }, { width: 4 }, { width: 12 }, { width: 40 }];
  dm.addRow(['Mã vai trò', 'Tên vai trò', '', 'Mã đơn vị', 'Tên đơn vị']);
  dm.getRow(1).font = { bold: true };
  const vaiTro = await trx('VAITRO');
  const donVi = await trx('DONVI').orderBy('MaDV');
  for (let i = 0; i < Math.max(vaiTro.length, donVi.length); i++) {
    dm.addRow([vaiTro[i]?.MaVaiTro || '', vaiTro[i]?.TenVaiTro || '', '', donVi[i]?.MaDV ?? '', donVi[i]?.TenDV || '']);
  }
  dm.addRow([]);
  dm.addRow(['Ghi chú: cột có dấu (*) là bắt buộc. Đầu mối (DAU_MOI) và chuyên viên thẩm định (THAM_DINH) bắt buộc có mã đơn vị. Mật khẩu ít nhất 6 ký tự. Xóa dòng ví dụ trước khi nhập.']);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// Lấy giá trị ô dưới dạng chuỗi (ô có thể là số, công thức, liên kết, rich text)
function chuoiO(o) {
  let v = o.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') v = v.text ?? v.result ?? (v.richText ? v.richText.map((x) => x.text).join('') : '');
  return String(v).trim();
}

async function nhapTuExcel(db, buffer, nguoi) {
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(buffer); } catch { throw new Loi(422, 'Không đọc được tệp. Hãy dùng tệp .xlsx theo mẫu.'); }
  const ws = wb.getWorksheet('TaiKhoan') || wb.worksheets[0];
  if (!ws) throw new Loi(422, 'Tệp không có sheet dữ liệu.');
  if (ws.actualRowCount - 1 > SO_DONG_TOI_DA) throw new Loi(422, `Mỗi lần nhập tối đa ${SO_DONG_TOI_DA} dòng.`);

  const vaiTro = (await db('VAITRO')).map((v) => v.MaVaiTro);
  const donVi = (await db('DONVI')).map((d) => d.MaDV);
  const daCo = new Set((await db('NGUOIDUNG').select('TenDangNhap')).map((n) => n.TenDangNhap.toLowerCase()));
  const boQua = [];
  const hopLe = [];
  ws.eachRow((row, soDong) => {
    if (soDong === 1) return; // dòng tiêu đề
    const d = Object.fromEntries(COT.map((k, i) => [k, chuoiO(row.getCell(i + 1))]));
    if (COT.every((k) => !d[k])) return; // dòng trống
    const loi = [];
    if (!d.HoTen) loi.push('thiếu họ tên');
    if (!/^[a-zA-Z0-9_.]{3,50}$/.test(d.TenDangNhap)) loi.push('tên đăng nhập phải gồm 3-50 ký tự chữ, số, gạch dưới hoặc dấu chấm');
    else if (daCo.has(d.TenDangNhap.toLowerCase())) loi.push('trùng tên đăng nhập');
    if (d.MatKhau.length < 6) loi.push('mật khẩu cần ít nhất 6 ký tự');
    d.MaVaiTro = d.MaVaiTro.toUpperCase();
    if (!vaiTro.includes(d.MaVaiTro)) loi.push('sai mã vai trò');
    let maDV = null;
    if (d.MaDV) {
      maDV = Number(d.MaDV);
      if (!donVi.includes(maDV)) loi.push('sai mã đơn vị');
    } else if (['DAU_MOI', 'THAM_DINH'].includes(d.MaVaiTro)) loi.push('vai trò này bắt buộc có mã đơn vị');
    if (loi.length) return boQua.push({ Dong: soDong, TenDangNhap: d.TenDangNhap, LyDo: loi.join('; ') });
    daCo.add(d.TenDangNhap.toLowerCase()); // chặn trùng ngay trong tệp
    hopLe.push({ HoTen: d.HoTen, TenDangNhap: d.TenDangNhap, MatKhau: d.MatKhau, Email: d.Email || null, SDT: d.SDT || null, MaVaiTro: d.MaVaiTro, MaDV: maDV });
  });

  await db.transaction(async (trx) => {
    for (const d of hopLe) await them(trx, 'NGUOIDUNG', { ...d, MatKhau: bcrypt.hashSync(d.MatKhau, 10), TrangThaiTK: 'HOAT_DONG' }, 'MaND');
    if (hopLe.length) await ghiNhatKy(trx, nguoi.MaND, 'NHAP_TAI_KHOAN_EXCEL', `Tạo ${hopLe.length} tài khoản, bỏ qua ${boQua.length} dòng`);
  });
  return { DaTao: hopLe.length, TaiKhoan: hopLe.map((d) => d.TenDangNhap), BoQua: boQua };
}

module.exports = { taoTepMau, nhapTuExcel };
