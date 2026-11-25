// Test chốt kỳ, tính điểm, so sánh, dashboard và Excel trên SQLite tạm.
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const ExcelJS = require('exceljs');

const tepDb = path.join(os.tmpdir(), `is028-ketqua-${process.pid}.sqlite`);
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_FILE = tepDb;

const { db } = require('../src/db');
const { taoBang } = require('../src/schema');
const { seed } = require('../src/seed');
const kySv = require('../src/services/ky');
const bcSv = require('../src/services/baocao');
const tongHop = require('../src/services/tonghop');
const { diemChiSo, tinhTongDiem, xepHang, xacDinhMucDo, lamTron2 } = require('../src/lib/scoring');

let s;
const vn = (x) => new Date(`${x}+07:00`);
const tuChoi = (fn, mau) => assert.rejects(fn, (e) => {
  assert.match(e.message, mau);
  return true;
});

test.before(async () => {
  await taoBang(db);
  s = await seed(db);
});

test.after(async () => {
  await db.destroy();
  fs.rmSync(tepDb, { force: true });
});

test('công thức có/không và tỷ lệ xử lý 0, âm, rỗng, quá chỉ tiêu', () => {
  const coKhong = { KieuCongThuc: 'CO_KHONG', DiemToiDa: 10 };
  assert.equal(diemChiSo(coKhong, [], 1), 10);
  assert.equal(diemChiSo(coKhong, [], 0), 0);
  assert.equal(diemChiSo(coKhong, [], null), 0);
  assert.equal(diemChiSo(coKhong, [], ''), 0);

  const caoTot = { KieuCongThuc: 'TY_LE', ChieuTot: 'CAO_TOT', ChiTieu: 80, DiemToiDa: 20 };
  assert.equal(diemChiSo(caoTot, [], 0), 0);
  assert.equal(diemChiSo(caoTot, [], -10), 0);
  assert.equal(diemChiSo(caoTot, [], 1000000000000), 20);
  assert.equal(diemChiSo({ ...caoTot, ChiTieu: 0 }, [], 1), 0);

  const thapTot = { KieuCongThuc: 'TY_LE', ChieuTot: 'THAP_TOT', ChiTieu: 5, DiemToiDa: 10 };
  assert.equal(diemChiSo(thapTot, [], 0), 10);
  assert.equal(diemChiSo(thapTot, [], 10), 5);
  assert.ok(diemChiSo(thapTot, [], 1000000000000) < 1e-9);
  // Số âm ngoài miền; luuNhap/guiBaoCao chặn trước khi giá trị được chấm.
  assert.equal(diemChiSo(thapTot, [], -1), 10);
});

test('công thức bậc thang tính hai biên, khoảng trống, giá trị âm và bậc không giới hạn', () => {
  const cs = { KieuCongThuc: 'BAC_THANG', DiemToiDa: 10 };
  const bac = [
    { TuGiaTri: 0, DenGiaTri: 0, Diem: 0 },
    { TuGiaTri: 1, DenGiaTri: 2, Diem: 5 },
    { TuGiaTri: 3, DenGiaTri: 5, Diem: 8 },
    { TuGiaTri: 6, DenGiaTri: null, Diem: 10 },
  ];
  assert.deepEqual([0, 1, 2, 3, 5, 6, 1000000000000, -1].map((v) => diemChiSo(cs, bac, v)), [0, 5, 5, 8, 8, 10, 10, 0]);
  assert.equal(diemChiSo(cs, bac, null), 0);
});

test('tổng điểm chia lại trọng số nhóm áp dụng và chỉ làm tròn kết quả cuối', () => {
  const nhoms = [
    { MaNhom: 1, TrongSo: 10 },
    { MaNhom: 2, TrongSo: 20 },
    { MaNhom: 3, TrongSo: 70 },
  ];
  const chiSos = [
    { MaChiSo: 1, MaNhom: 1, DiemToiDa: 3 },
    { MaChiSo: 2, MaNhom: 2, DiemToiDa: 3 },
  ];
  const kq = tinhTongDiem(nhoms, chiSos, new Map([[1, 1], [2, 2]]));
  assert.equal(kq.TongTrongSo, 30);
  assert.equal(kq.Nhom.length, 2);
  assert.equal(kq.TongDiem, 55.56);
  assert.equal(lamTron2(1.005), 1.01);
  assert.equal(lamTron2(99.999), 100);
});

test('xếp hạng đồng điểm và biên các mức độ', () => {
  const hang = xepHang([
    { id: 'a', diem: 100 }, { id: 'b', diem: 50 }, { id: 'c', diem: 100 },
    { id: 'd', diem: 50 }, { id: 'e', diem: 0 },
  ]);
  assert.deepEqual(['a', 'c', 'b', 'd', 'e'].map((id) => hang.get(id)), [1, 1, 3, 3, 5]);

  const mucDo = [
    { TenMucDo: 'Yếu', DiemTu: 0, DiemDen: 50 },
    { TenMucDo: 'Khá', DiemTu: 50, DiemDen: 80 },
    { TenMucDo: 'Tốt', DiemTu: 80, DiemDen: 90 },
    { TenMucDo: 'Xuất sắc', DiemTu: 90, DiemDen: 100 },
  ];
  assert.deepEqual([0, 49.99, 50, 79.99, 80, 90, 100].map((x) => xacDinhMucDo(mucDo, x).TenMucDo),
    ['Yếu', 'Yếu', 'Khá', 'Khá', 'Tốt', 'Xuất sắc', 'Xuất sắc']);
  assert.equal(xacDinhMucDo(mucDo, 100.01), null);
});

test('giá trị nhập rỗng lưu thành null, không thể gửi và không tạo điểm', async () => {
  const giao = await db('GIAODONVI').where({ MaKy: s.kyQ4, MaDV: s.dv.xb }).first();
  const { MaBC } = await bcSv.luuNhap(db, giao.MaGiao, s.CS.CS11, '', s.nd.dm_xb);
  const bc = await db('BAOCAOSOLIEU').where({ MaBC }).first();
  assert.equal(bc.GiaTri, null);
  await assert.rejects(() => bcSv.guiBaoCao(db, MaBC, s.nd.dm_xb), (e) => {
    assert.match(e.message, /chưa đủ điều kiện gửi/);
    assert.ok(e.chiTiet.some((x) => /Chưa nhập giá trị/.test(x)));
    return true;
  });
  const { MaBC: maBCAm } = await bcSv.luuNhap(db, giao.MaGiao, s.CS.CS12, -1, s.nd.dm_xb);
  await assert.rejects(() => bcSv.guiBaoCao(db, maBCAm, s.nd.dm_xb), (e) => {
    assert.ok(e.chiTiet.some((x) => /ngoài miền hợp lệ/.test(x)));
    return true;
  });
  const chiTiet = await kySv.chiTietDiem(db, giao.MaGiao);
  assert.equal(chiTiet.ChiSo.find((c) => c.MaChiSo === s.CS.CS11).Diem, 0);
});

test('kết quả năm 2025 khớp 81,76 điểm của Xã B và Phụ lục B', async () => {
  const { KetQua } = await kySv.ketQuaKy(db, s.kyNam);
  const xb = KetQua.find((k) => k.MaDV === s.dv.xb);
  assert.deepEqual([xb.TongDiem, xb.TenMucDo], [81.76, 'Tốt']);
  assert.ok(KetQua.every((k) => Number.isInteger(k.HangTheoLoai) && Number.isInteger(k.HangChung)));
  const ct = await kySv.chiTietDiem(db, xb.MaGiao);
  assert.equal(ct.TongTrongSo, 85);
  assert.equal(ct.ChiSo.find((c) => c.KyHieu === 'CS04').Diem, 10.5);
  assert.ok(Math.abs(ct.ChiSo.find((c) => c.KyHieu === 'CS05').Diem - 9.2) < 1e-10);
  assert.equal(ct.ChiSo.find((c) => c.KyHieu === 'CS06').Diem, 0);
});

test('thống kê chốt trước hạn, chốt điểm chưa Đạt bằng 0 và từ chối chốt lần hai', async () => {
  const luc = vn('2026-11-11T12:00:00');
  const q4 = await kySv.thongKeChot(db, s.kyQ4, luc);
  assert.equal(q4.DuDieuKien, false);
  assert.match(q4.LyDo, /chưa qua hạn/);
  await tuChoi(() => kySv.chotKy(db, s.kyQ4, s.nd.chutri, luc), /chưa qua hạn/);

  const tk = await kySv.thongKeChot(db, s.kyQ3, luc);
  assert.deepEqual([tk.DuDieuKien, tk.SoDonVi, tk.Dat, tk.ChoThamDinh, tk.CanBoSung, tk.ChuaNop], [true, 6, 14, 7, 1, 2]);
  const soBanGhiTruoc = Number((await db('KETQUADANHGIA').count({ n: '*' }).first()).n);
  await kySv.chotKy(db, s.kyQ3, s.nd.chutri, luc);
  const kq = await kySv.ketQuaKy(db, s.kyQ3);
  assert.equal(kq.KetQua.length, 6);
  assert.equal(kq.KetQua.find((x) => x.MaDV === s.dv.skhcn).TongDiem, 99.17);
  assert.equal(kq.KetQua.find((x) => x.MaDV === s.dv.dkc).TongDiem, 12.5);

  const dkc = await db('GIAODONVI').where({ MaKy: s.kyQ3, MaDV: s.dv.dkc }).first();
  const chiTiet = await kySv.chiTietDiem(db, dkc.MaGiao);
  assert.deepEqual(
    chiTiet.ChiSo.filter((c) => ['CS10', 'CS11', 'CS12'].includes(c.KyHieu)).map((c) => [c.KyHieu, c.TrangThaiBC, c.Diem]),
    [['CS10', 'CHO_THAM_DINH', 0], ['CS11', null, 0], ['CS12', null, 0]],
  );

  await tuChoi(() => kySv.chotKy(db, s.kyQ3, s.nd.chutri, luc), /Chưa chốt được kỳ/);
  assert.equal(Number((await db('KETQUADANHGIA').count({ n: '*' }).first()).n), soBanGhiTruoc + 6);
  await tuChoi(() => bcSv.luuNhap(db, dkc.MaGiao, s.CS.CS08, 50, s.nd.dm_dkc), /đã chốt/);
});

test('so sánh kỳ liền trước cùng loại, hạng và đơn vị không có kỳ trước', async () => {
  const ss = await tongHop.soSanh(db, s.kyNam);
  assert.deepEqual([ss.KyTruoc.TenKy, ss.CungBo], ['Kỳ năm 2024', true]);
  const xb = ss.DonVi.find((d) => d.MaDV === s.dv.xb);
  assert.deepEqual([xb.Diem, xb.DiemTruoc, xb.ChenhDiem, xb.ChenhHang], [81.76, 63.07, 18.69, 0]);
  assert.equal(xb.Nhom.find((n) => n.TenNhom === 'Thể chế số').Chenh, 46);
  assert.equal(xb.ChiSo.find((c) => c.KyHieu === 'CS03').Chenh, 10);
  const dkc = ss.DonVi.find((d) => d.MaDV === s.dv.dkc);
  assert.deepEqual([dkc.CoKyNay, dkc.CoKyTruoc, dkc.ChenhDiem, dkc.ChiSo], [true, false, null, undefined]);

  const kyDau = await tongHop.soSanh(db, s.kyNam2024);
  assert.equal(kyDau.KyTruoc, null);
  assert.ok(kyDau.DonVi.every((d) => d.ChenhDiem === null));
  await tuChoi(() => tongHop.soSanh(db, s.kyQ4), /chưa chốt/);
});

test('dashboard trả thống kê mẫu chính xác và không tính nhóm không áp dụng', async () => {
  const d = await tongHop.dashboard(db, s.kyNam);
  assert.deepEqual([d.SoDonVi, d.DiemTrungBinh], [6, 76.21]);
  assert.deepEqual([d.CaoNhat.TenDV, d.CaoNhat.TongDiem], ['Sở Khoa học và Công nghệ', 98.05]);
  assert.deepEqual([d.ThapNhat.TenDV, d.ThapNhat.TongDiem], ['UBND Đặc khu C', 42.3]);
  assert.equal(d.TheoMucDo.reduce((n, m) => n + m.SoDonVi, 0), 6);
  assert.equal(d.TheoLoai.reduce((n, x) => n + x.SoDonVi, 0), 6);
  assert.equal(d.TheoNhom.find((n) => n.TenNhom === 'An toàn thông tin mạng').SoDonVi, 3);
  assert.equal(d.DonVi.find((x) => x.MaDV === s.dv.xb).HangTheoLoai, 2);
});

test('xuất Excel tạo đủ 4 sheet, cột và số liệu trùng kết quả dịch vụ', async () => {
  const { buffer, tenTep } = await tongHop.xuatExcel(db, s.kyNam);
  assert.equal(tenTep, `ket-qua-ky-${s.kyNam}.xlsx`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Tổng hợp chung', 'Xếp hạng theo loại', 'Điểm nhóm', 'Điểm chỉ số']);

  const chung = wb.getWorksheet('Tổng hợp chung');
  assert.deepEqual([chung.getRow(2).getCell(1).value, chung.getRow(2).getCell(4).value], ['Hạng chung', 'Tổng điểm']);
  const xbChung = chung.getRows(3, chung.rowCount - 2).find((r) => r.getCell(2).value === 'UBND Xã B');
  assert.deepEqual([xbChung.getCell(1).value, xbChung.getCell(4).value, xbChung.getCell(5).value, xbChung.getCell(6).value], [4, 81.76, 2, 'Tốt']);

  const theoLoai = wb.getWorksheet('Xếp hạng theo loại');
  const xbLoai = theoLoai.getRows(2, theoLoai.rowCount - 1).find((r) => r.getCell(3).value === 'UBND Xã B');
  assert.deepEqual([xbLoai.getCell(2).value, xbLoai.getCell(4).value], [2, 81.76]);

  const nhom = wb.getWorksheet('Điểm nhóm');
  const xbNhom = nhom.getRows(2, nhom.rowCount - 1).find((r) => r.getCell(1).value === 'UBND Xã B');
  assert.equal(xbNhom.getCell(nhom.columnCount).value, 81.76);
  assert.equal(xbNhom.getCell(nhom.columnCount - 1).value, 85);

  const chiSo = wb.getWorksheet('Điểm chỉ số');
  const cs04 = chiSo.getRows(2, chiSo.rowCount - 1).find((r) => r.getCell(1).value === 'UBND Xã B' && r.getCell(2).value === 'CS04');
  assert.deepEqual([cs04.getCell(5).value, cs04.getCell(6).value, cs04.getCell(7).value, cs04.getCell(8).value], [70, 'Đạt', 10.5, 15]);
});
