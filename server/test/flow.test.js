// Test luồng nghiệp vụ trên SQLite tạm: tạo bảng, seed, rồi kiểm tra các quy tắc chính.
const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const fs = require('fs');

const tepDb = path.join(os.tmpdir(), `is028-test-${process.pid}.sqlite`);
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_FILE = tepDb;
const { db } = require('../src/db');
const { taoBang } = require('../src/schema');
const { seed } = require('../src/seed');
const kySv = require('../src/services/ky');
const bcSv = require('../src/services/baocao');
const bochiso = require('../src/services/bochiso');
const tongHop = require('../src/services/tonghop');
const nhapExcel = require('../src/services/nhapexcel');
const ExcelJS = require('exceljs');

let s;
const vn = (x) => new Date(`${x}+07:00`);
const tuChoi = (fn, mau) => assert.rejects(fn, (e) => { assert.match(e.message, mau); return true; });

test.before(async () => { await taoBang(db); s = await seed(db); });
test.after(async () => { await db.destroy(); fs.rmSync(tepDb, { force: true }); });

test('kỳ năm 2025 đã chốt: Xã B đạt 81,76 điểm, đúng Phụ lục B', async () => {
  const { KetQua } = await kySv.ketQuaKy(db, s.kyNam);
  assert.equal(KetQua.length, 6);
  const xb = KetQua.find((k) => k.MaDV === s.dv.xb);
  assert.equal(xb.TongDiem, 81.76);
  assert.equal(xb.TenMucDo, 'Tốt');
  // hạng theo loại nằm trong 1..3, hạng chung trong 1..6
  assert.ok(KetQua.every((k) => k.HangTheoLoai >= 1 && k.HangTheoLoai <= 3 && k.HangChung >= 1 && k.HangChung <= 6));
  const ct = await kySv.chiTietDiem(db, xb.MaHS);
  assert.equal(ct.TongTrongSo, 85);
  assert.equal(ct.ChiSo.find((c) => c.KyHieu === 'CS04').Diem, 10.5);
});

test('kỳ đã chốt bị khóa (RB19) và không chốt lại được', async () => {
  const g = await db('HOSODANHGIA').where({ MaKy: s.kyNam, MaDV: s.dv.xb }).first();
  await tuChoi(() => bcSv.luuNhap(db, g.MaHS, s.CS.CS01, 0, s.nd.dm_xb), /đã chốt/);
  await tuChoi(() => kySv.chotKy(db, s.kyNam, s.nd.chutri), /Chưa chốt được/);
});

test('bộ đã ban hành bị khóa; sao chép tạo bộ Nháp đầy đủ (BR14)', async () => {
  await tuChoi(() => bochiso.yeuCauNhap(db, s.maBo), /đã khóa/);
  const maMoi = await bochiso.saoChep(db, s.maBo, 'Bộ sao chép');
  const bo = await bochiso.layBo(db, maMoi);
  assert.equal(bo.TrangThaiBo, 'NHAP');
  assert.equal(bo.Nhom.length, 6);
  assert.equal(bo.Nhom.reduce((n, x) => n + x.ChiSo.length, 0), 15);
  assert.equal(bo.MucDo.length, 5);
  assert.deepEqual(bochiso.kiemTraBanHanh(bo), []);
  // làm lệch trọng số -> không ban hành được (RB08)
  await db('NHOMCHISO').where({ MaNhom: bo.Nhom[0].MaNhom }).update({ TrongSo: 20 });
  await assert.rejects(() => bochiso.banHanh(db, maMoi, s.nd.chutri), (e) => e.chiTiet.some((x) => /RB08/.test(x)));
});

test('đầu mối chỉ sửa dữ liệu đơn vị mình (BR19); chỉ số không áp dụng bị chặn (RB11)', async () => {
  const g = await db('HOSODANHGIA').where({ MaKy: s.kyQ4, MaDV: s.dv.xb }).first();
  await tuChoi(() => bcSv.luuNhap(db, g.MaHS, s.CS.CS08, 50, s.nd.dm_pa), /đơn vị mình/);
  await tuChoi(() => bcSv.luuNhap(db, g.MaHS, s.CS.CS01, 1, s.nd.dm_xb), /không áp dụng/); // CS01 tần suất năm, kỳ quý
});

test('lưu nháp ngoài miền chỉ cảnh báo, gửi thì chặn; thiếu minh chứng bắt buộc cũng chặn (BR06, BR21, RB16)', async () => {
  const g = await db('HOSODANHGIA').where({ MaKy: s.kyQ4, MaDV: s.dv.pa }).first();
  const { MaBC, CanhBao } = await bcSv.luuNhap(db, g.MaHS, s.CS.CS11, 150, s.nd.dm_pa);
  assert.match(CanhBao, /ngoài miền/);
  await assert.rejects(() => bcSv.guiBaoCao(db, MaBC, s.nd.dm_pa), (e) => e.chiTiet.length === 2);
  await tuChoi(() => bcSv.luuNhap(db, g.MaHS, s.CS.CS11, 'abc', s.nd.dm_pa), /phải là số/);
});

test('vòng thẩm định: Chưa đạt cần nhận xét, gửi lại không ghi đè NgayGui, không tự thẩm định (BR07, BR09, BR18)', async () => {
  const g = await db('HOSODANHGIA').where({ MaKy: s.kyQ4, MaDV: s.dv.syt }).first();
  const luc1 = vn('2026-11-10T09:00:00');
  const { MaBC } = await bcSv.luuNhap(db, g.MaHS, s.CS.CS12, 91, s.nd.dm_syt);
  const mc = await db('LOAIMINHCHUNG').first();
  const maMC = await bcSv.themMinhChung(db, MaBC, { TenTep: 'a.pdf', DuongDan: 'minh-chung-mau.pdf', DungLuong: 10 }, mc.MaLoaiMC, s.nd.dm_syt, luc1);
  await bcSv.guiBaoCao(db, MaBC, s.nd.dm_syt, luc1);
  // đang chờ thẩm định thì đầu mối không sửa được
  await tuChoi(() => bcSv.luuNhap(db, g.MaHS, s.CS.CS12, 92, s.nd.dm_syt), /không sửa được/);
  // chuyên viên cùng đơn vị bị chặn; danh sách chờ của họ không có báo cáo này
  await tuChoi(() => bcSv.ketLuan(db, MaBC, 'DAT', null, s.nd.td_syt), /đơn vị mình/);
  assert.ok(!(await bcSv.danhSachCho(db, s.nd.td_syt)).some((x) => x.MaBC === MaBC));
  assert.ok((await bcSv.danhSachCho(db, s.nd.td_skhcn)).some((x) => x.MaBC === MaBC));
  await tuChoi(() => bcSv.ketLuan(db, MaBC, 'CHUA_DAT', '  ', s.nd.td_skhcn), /bắt buộc có nhận xét/);
  await bcSv.ketLuan(db, MaBC, 'CHUA_DAT', 'Thiếu số liệu tháng 12', s.nd.td_skhcn, vn('2026-11-11T09:00:00'));
  assert.equal((await db('BAOCAOSOLIEU').where({ MaBC }).first()).TrangThaiBC, 'CAN_BO_SUNG');
  // bổ sung: thay minh chứng (không xóa), gửi lại
  await bcSv.thayTheMinhChung(db, maMC, s.nd.dm_syt);
  await tuChoi(() => bcSv.guiBaoCao(db, MaBC, s.nd.dm_syt), /chưa đủ điều kiện/); // hết minh chứng hiệu lực
  await bcSv.themMinhChung(db, MaBC, { TenTep: 'b.pdf', DuongDan: 'minh-chung-mau.pdf', DungLuong: 10 }, mc.MaLoaiMC, s.nd.dm_syt);
  await bcSv.guiBaoCao(db, MaBC, s.nd.dm_syt, vn('2026-11-12T09:00:00'));
  const bc = await db('BAOCAOSOLIEU').where({ MaBC }).first();
  assert.equal(new Date(bc.NgayGui).getTime(), luc1.getTime());
  await bcSv.ketLuan(db, MaBC, 'DAT', null, s.nd.td_skhcn);
  await tuChoi(() => bcSv.ketLuan(db, MaBC, 'DAT', null, s.nd.td_skhcn), /không còn ở trạng thái/);
  const ct = await bcSv.chiTietBaoCao(db, MaBC);
  assert.deepEqual(ct.ThamDinh.map((t) => [t.VongThamDinh, t.KetLuan]), [[1, 'CHUA_DAT'], [2, 'DAT']]);
  assert.deepEqual(ct.MinhChung.map((m) => m.TrangThaiMC), ['DA_THAY_THE', 'HIEU_LUC']);
});

test('gia hạn: sau hạn hiện hành, không vượt ngày chốt, nhiều lần, hết hạn thì chặn (BR16, BR22, BR25)', async () => {
  const g = await db('HOSODANHGIA').where({ MaKy: s.kyQ4, MaDV: s.dv.dkc }).first(); // hạn 10/01/2027, chốt 31/01/2027
  const luc = vn('2026-12-01T09:00:00');
  await tuChoi(() => kySv.giaHan(db, g.MaHS, '2027-01-10', s.nd.chutri, luc), /phải sau hạn hiện hành/);
  await tuChoi(() => kySv.giaHan(db, g.MaHS, '2027-02-01', s.nd.chutri, luc), /không được vượt ngày chốt/);
  await kySv.giaHan(db, g.MaHS, '2027-01-15', s.nd.chutri, luc);
  // 23:59:00 ngày hạn vẫn còn hạn (BR25) -> gia hạn lần 2 được
  await kySv.giaHan(db, g.MaHS, '2027-01-20', s.nd.chutri, vn('2027-01-15T23:59:00'));
  await tuChoi(() => kySv.giaHan(db, g.MaHS, '2027-01-25', s.nd.chutri, vn('2027-01-21T00:00:01')), /quá hạn hiện hành/);
  // kỳ quý 3 đã quá hạn từ 10/10/2026
  const g3 = await db('HOSODANHGIA').where({ MaKy: s.kyQ3 }).first();
  await tuChoi(() => kySv.giaHan(db, g3.MaHS, '2026-10-20', s.nd.chutri, vn('2026-10-12T09:00:00')), /quá hạn hiện hành/);
});

test('tiến độ kỳ quý 3: đếm trễ hạn theo lần gửi đầu (BR07)', async () => {
  const td = await kySv.tienDo(db, s.kyQ3, vn('2026-11-11T12:00:00'));
  const snv = td.find((x) => x.MaDV === s.dv.snv);
  assert.deepEqual([snv.SoChiSo, snv.Dat, snv.CanBoSung, snv.ChoThamDinh, snv.GuiTre], [4, 2, 1, 1, 4]);
  const dkc = td.find((x) => x.MaDV === s.dv.dkc);
  assert.deepEqual([dkc.ChuaNop, dkc.ChuaGuiQuaHan], [2, 2]);
});

test('chốt kỳ quý 3: chưa Đạt tính 0 điểm, chia lại trọng số 60, thông báo + nhật ký (BR10)', async () => {
  const luc = vn('2026-11-11T12:00:00');
  await tuChoi(() => kySv.chotKy(db, s.kyQ4, s.nd.chutri, luc), /chưa qua hạn/);
  const tk = await kySv.thongKeChot(db, s.kyQ3, luc);
  assert.equal(tk.DuDieuKien, true);
  assert.deepEqual([tk.SoDonVi, tk.CanBoSung, tk.ChuaNop], [6, 1, 2]);
  await kySv.chotKy(db, s.kyQ3, s.nd.chutri, luc);
  const { Ky, KetQua } = await kySv.ketQuaKy(db, s.kyQ3);
  assert.equal(Ky.TrangThaiKy, 'DA_CHOT');
  // Sở KH&CN: CS08 85/80 -> 10/10 (N4=1); CS10 0 sự cố -> 10/10 (N5=1); CS11 78/80*20=19,5 + CS12 10 => 29,5/30 (N6)
  // tổng = (15 + 15 + 29,5/30*30) / 60 * 100 = 99,17
  assert.equal(KetQua.find((k) => k.MaDV === s.dv.skhcn).TongDiem, 99.17);
  // Đặc khu C: chỉ CS08 Đạt: 40/80*10=5/10 -> N4 0,5; còn lại 0 => 7,5/60*100 = 12,5
  assert.equal(KetQua.find((k) => k.MaDV === s.dv.dkc).TongDiem, 12.5);
  assert.equal(await db('KETQUADANHGIA').count({ n: '*' }).first().then((r) => Number(r.n)), 23); // 6 + 5 + 6 của ba kỳ seed đã chốt, cộng 6 của kỳ quý 3
  assert.ok(await db('NHATKY').where({ HanhDong: 'CHOT_KY' }).where('DoiTuong', 'like', `Kỳ #${s.kyQ3}%`).first());
  assert.ok(await db('THONGBAO').where({ LoaiTB: 'CHOT_KET_QUA', MaND: s.nd.lanhdao.MaND }).first());
});

test('mốc ngày sai thứ tự bị chặn (RB04); kỳ Nháp không mở được khi chưa giao (BR17)', async () => {
  const d = { TenKy: 'Kỳ thử', LoaiKy: 'NAM', NgayBatDau: '2026-01-01', NgayKetThuc: '2026-12-31', HanNop: '2026-12-01', NgayChot: '2027-02-01', MaBo: s.maBo };
  await tuChoi(() => kySv.taoKy(db, d), /RB04/);
  const maKy = await kySv.taoKy(db, { ...d, HanNop: '2027-01-15' });
  await tuChoi(() => kySv.moKy(db, maKy, s.nd.chutri), /ít nhất một lượt giao/);
});

test('nhắc hạn tự động không gửi trùng (BR15)', async () => {
  const luc = vn('2027-01-09T08:00:00'); // kỳ quý 4 hạn 10/01/2027
  const lan1 = await kySv.nhacHan(db, luc);
  assert.ok(lan1 > 0);
  assert.equal(await kySv.nhacHan(db, luc), 0);
});

test('so sánh kỳ năm 2025 với kỳ năm 2024: chênh điểm, hạng, điểm nhóm, từng chỉ số; đơn vị vắng kỳ trước (UC 5.2)', async () => {
  const ss = await tongHop.soSanh(db, s.kyNam);
  assert.equal(ss.KyTruoc.TenKy, 'Kỳ năm 2024');
  assert.equal(ss.CungBo, true);
  const xb = ss.DonVi.find((d) => d.MaDV === s.dv.xb);
  assert.equal(xb.Diem, 81.76);
  // Xã B 2024 tính tay: N1 15/20*10=7,5; N2 9/25*15=5,4; N3 8,5/15*15=8,5; N4 5/5*15=15; N6 (55/85*10+5)/20*30=17,206
  // tổng 53,606 / 85 * 100 = 63,07
  assert.equal(xb.DiemTruoc, 63.07);
  assert.equal(xb.ChenhDiem, 18.69);
  assert.equal(xb.ChiSo.find((c) => c.KyHieu === 'CS03').Chenh, 10);
  assert.equal(xb.Nhom.find((n) => n.TenNhom === 'Thể chế số').Chenh, 46); // 82 - 36
  const dkc = ss.DonVi.find((d) => d.MaDV === s.dv.dkc);
  assert.deepEqual([dkc.CoKyNay, dkc.CoKyTruoc, dkc.ChenhDiem, dkc.ChiSo], [true, false, null, undefined]);
  // kỳ đầu tiên của loại: không có kỳ trước
  const dau = await tongHop.soSanh(db, s.kyNam2024);
  assert.equal(dau.KyTruoc, null);
  assert.ok(dau.DonVi.every((d) => d.ChenhDiem === null));
  // kỳ chưa chốt thì không so sánh được
  await tuChoi(() => tongHop.soSanh(db, s.kyQ4), /chưa chốt/);
});

test('kỳ quý 3 (đã chốt ở test trên) so với kỳ quý 2, không so với kỳ năm (UC 5.2 bước 3)', async () => {
  const ss = await tongHop.soSanh(db, s.kyQ3);
  assert.equal(ss.KyTruoc.TenKy, 'Kỳ quý 2 năm 2026');
  assert.equal(ss.DonVi.length, 6);
});

test('dashboard và xuất Excel của kỳ năm 2025 (UC 5.3)', async () => {
  const d = await tongHop.dashboard(db, s.kyNam);
  assert.equal(d.SoDonVi, 6);
  assert.equal(d.TheoMucDo.reduce((n, m) => n + m.SoDonVi, 0), 6);
  assert.equal(d.TheoLoai.length, 2);
  assert.equal(d.TheoNhom.find((n) => n.TenNhom === 'An toàn thông tin mạng').SoDonVi, 3); // chỉ sở có nhóm này ở kỳ năm
  const { buffer } = await tongHop.xuatExcel(db, s.kyNam);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Tổng hợp chung', 'Xếp hạng theo loại', 'Điểm nhóm', 'Điểm chỉ số']);
  const dong = [];
  wb.getWorksheet('Tổng hợp chung').eachRow((r) => dong.push(r.values));
  assert.ok(dong.some((r) => r[2] === 'UBND Xã B' && r[4] === 81.76));
});

test('nhập tài khoản bằng Excel: tạo dòng hợp lệ, bỏ qua và liệt kê dòng lỗi (UC 1.2)', async () => {
  const mau = new ExcelJS.Workbook();
  await mau.xlsx.load(await nhapExcel.taoTepMau(db));
  assert.ok(mau.getWorksheet('TaiKhoan') && mau.getWorksheet('DanhMuc'));
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('TaiKhoan');
  ws.addRow(['Họ tên', 'Tên đăng nhập', 'Mật khẩu', 'Mã vai trò', 'Mã đơn vị']);
  ws.addRow(['Người Mới Một', 'moi_1', 'matkhau1', 'dau_moi', s.dv.pa]); // mã vai trò chữ thường vẫn nhận
  ws.addRow(['Người Trùng', 'chutri', 'matkhau1', 'CHU_TRI', '']); // trùng tên có sẵn
  ws.addRow(['Người Sai', 'sai_1', '123', 'KHONG_CO', 9999]); // 3 lỗi
  ws.addRow(['Thiếu Đơn Vị', 'td_moi', 'matkhau1', 'THAM_DINH', '']);
  ws.addRow(['Người Lặp', 'moi_1', 'matkhau1', 'LANH_DAO', '']); // trùng ngay trong tệp
  ws.addRow(['Lãnh Đạo Mới', 'ld_moi', 'matkhau1', 'LANH_DAO', '']);
  const kq = await nhapExcel.nhapTuExcel(db, Buffer.from(await wb.xlsx.writeBuffer()), s.nd.admin);
  assert.deepEqual(kq.TaiKhoan, ['moi_1', 'ld_moi']);
  assert.deepEqual(kq.BoQua.map((b) => b.Dong), [3, 4, 5, 6]);
  assert.match(kq.BoQua[1].LyDo, /mật khẩu.*sai mã vai trò.*sai mã đơn vị/);
  const moi = await db('NGUOIDUNG').where({ TenDangNhap: 'moi_1' }).first();
  assert.deepEqual([moi.MaVaiTro, moi.MaDV, moi.MatKhau.startsWith('$2')], ['DAU_MOI', s.dv.pa, true]); // mật khẩu được băm
  await tuChoi(() => nhapExcel.nhapTuExcel(db, Buffer.from('khong phai excel'), s.nd.admin), /Không đọc được tệp/);
});
