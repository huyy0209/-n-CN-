// Test mức HTTP cho nhóm "Hệ thống, xác thực, phân quyền, bảo mật API" (opencode).
// Dựng app Express thật từ src/app.js trên SQLite tạm, gọi bằng fetch của Node.
// Phạm vi: routes/hethong.js, middleware/auth.js, ma trận phân quyền toàn bộ route, IDOR, rò rỉ dữ liệu.
const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');

// --- Môi trường phải đặt TRƯỚC khi require app/db/middleware ---
const tepDb = path.join(os.tmpdir(), `is028-hethong-${process.pid}.sqlite`);
const BI_MAT = 'test-secret-hethong-baomat-2026';
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_FILE = tepDb;
process.env.JWT_SECRET = BI_MAT;
process.env.MAX_FILE_MB = '10';

const app = require('../src/app');
const { db, them } = require('../src/db');
const { taoBang } = require('../src/schema');
const { seed } = require('../src/seed');

let server;
let base;
let s;
const tok = {}; // token theo khóa tài khoản mẫu
const ids = {}; // id tạo thêm trong test

// Gọi API, tự chọn cách đọc body theo content-type
async function goi(method, duongDan, { token, body, form, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form; // fetch tự đặt multipart boundary
  } else if (body !== undefined) {
    h['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + duongDan, { method, headers: h, body: payload });
  const loai = res.headers.get('content-type') || '';
  const laJson = loai.includes('application/json');
  const data = laJson ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers, text: laJson ? JSON.stringify(data) : '' };
}

async function dangNhap(tenDN, matKhau = '123456') {
  const r = await goi('POST', '/api/auth/login', { body: { TenDangNhap: tenDN, MatKhau: matKhau } });
  assert.equal(r.status, 200, `đăng nhập ${tenDN} phải thành công, nhận ${r.status}: ${r.text}`);
  return r.data.token;
}

// Tạo tài khoản trực tiếp trong CSDL (dùng bcrypt cost thấp cho nhanh)
async function taoNguoiDung({ TenDangNhap, MatKhau = '123456', MaVaiTro = 'LANH_DAO', MaDV = null, TrangThaiTK = 'HOAT_DONG' }) {
  return them(db, 'NGUOIDUNG', {
    HoTen: `Tạm ${TenDangNhap}`, TenDangNhap, MatKhau: bcrypt.hashSync(MatKhau, 4),
    TrangThaiTK, MaVaiTro, MaDV,
  }, 'MaND');
}

const kyTuBase64Url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

test.before(async () => {
  await taoBang(db);
  s = await seed(db);
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
  for (const ten of ['admin', 'chutri', 'lanhdao', 'dm_skhcn', 'dm_syt', 'dm_pa', 'dm_xb', 'td_skhcn', 'td_syt']) {
    tok[ten] = await dangNhap(ten);
  }
});

test.after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await db.destroy();
  fs.rmSync(tepDb, { force: true });
});

// ===================== 1. Đăng nhập =====================
test('đăng nhập: đúng nhận token; sai mật khẩu, sai tài khoản, tài khoản khóa đều 401', async () => {
  const dung = await goi('POST', '/api/auth/login', { body: { TenDangNhap: 'admin', MatKhau: '123456' } });
  assert.equal(dung.status, 200);
  assert.equal(typeof dung.data.token, 'string');
  assert.ok(dung.data.token.length > 20);

  const saiMk = await goi('POST', '/api/auth/login', { body: { TenDangNhap: 'admin', MatKhau: 'sai-mat-khau' } });
  assert.equal(saiMk.status, 401);
  const saiTen = await goi('POST', '/api/auth/login', { body: { TenDangNhap: 'khong_ton_tai_xyz', MatKhau: '123456' } });
  assert.equal(saiTen.status, 401);
  // Không lộ tài khoản nào tồn tại: sai tên và sai mật khẩu cùng thông báo
  assert.equal(saiTen.data.message, saiMk.data.message);

  const maKhoa = await taoNguoiDung({ TenDangNhap: 'tk_bi_khoa', TrangThaiTK: 'KHOA' });
  const khoa = await goi('POST', '/api/auth/login', { body: { TenDangNhap: 'tk_bi_khoa', MatKhau: '123456' } });
  assert.equal(khoa.status, 401);
  assert.match(khoa.data.message, /khóa/i);
  assert.ok(maKhoa);
});

// ===================== 2. JWT và /auth/me =====================
test('/auth/me + JWT: hợp lệ được, thiếu/sai/hết hạn/giả chữ ký/alg none/tài khoản không tồn tại đều 401', async () => {
  const me = await goi('GET', '/api/auth/me', { token: tok.admin });
  assert.equal(me.status, 200);
  assert.equal(me.data.TenDangNhap, 'admin');
  assert.equal(me.data.MaVaiTro, 'QUAN_TRI');
  assert.ok(me.data.MaND);
  assert.ok(!('MatKhau' in me.data), '/auth/me không được trả MatKhau');

  assert.equal((await goi('GET', '/api/auth/me')).status, 401, 'thiếu token phải 401');
  assert.equal((await goi('GET', '/api/auth/me', { token: 'khong-phai-jwt' })).status, 401, 'token rác phải 401');

  const hetHan = jwt.sign({ MaND: s.nd.admin.MaND }, BI_MAT, { expiresIn: -10 });
  assert.equal((await goi('GET', '/api/auth/me', { token: hetHan })).status, 401, 'token hết hạn phải 401');

  const giaChuKy = jwt.sign({ MaND: s.nd.admin.MaND }, 'bi-mat-khong-dung');
  assert.equal((await goi('GET', '/api/auth/me', { token: giaChuKy })).status, 401, 'chữ ký sai phải 401');

  const algNone = `${kyTuBase64Url({ alg: 'none', typ: 'JWT' })}.${kyTuBase64Url({ MaND: s.nd.admin.MaND })}.`;
  assert.equal((await goi('GET', '/api/auth/me', { token: algNone })).status, 401, 'alg none phải bị từ chối');

  const khongTonTai = jwt.sign({ MaND: 987654321 }, BI_MAT);
  assert.equal((await goi('GET', '/api/auth/me', { token: khongTonTai })).status, 401, 'MaND không tồn tại phải 401');
});

test('khóa tài khoản giữa phiên: token cũ mất quyền ngay lập tức', async () => {
  const ma = await taoNguoiDung({ TenDangNhap: 'tk_tam_khoa_giua_phien' });
  const tk = await dangNhap('tk_tam_khoa_giua_phien');
  assert.equal((await goi('GET', '/api/auth/me', { token: tk })).status, 200);
  await db('NGUOIDUNG').where({ MaND: ma }).update({ TrangThaiTK: 'KHOA' });
  assert.equal((await goi('GET', '/api/auth/me', { token: tk })).status, 401);
});

// ===================== 3. Đổi mật khẩu =====================
test('đổi mật khẩu: sai mật khẩu cũ 422, mật khẩu mới yếu 422, đổi xong đăng nhập bằng mật khẩu mới', async () => {
  await taoNguoiDung({ TenDangNhap: 'tk_doi_mat_khau', MatKhau: '123456' });
  const tk = await dangNhap('tk_doi_mat_khau');

  const saiCu = await goi('POST', '/api/auth/doi-mat-khau', { token: tk, body: { MatKhauCu: 'sai-hoan-toan', MatKhauMoi: 'MatKhauMoi#2026' } });
  assert.equal(saiCu.status, 422);

  const yeu = await goi('POST', '/api/auth/doi-mat-khau', { token: tk, body: { MatKhauCu: '123456', MatKhauMoi: '123' } });
  assert.equal(yeu.status, 422);

  const ok = await goi('POST', '/api/auth/doi-mat-khau', { token: tk, body: { MatKhauCu: '123456', MatKhauMoi: 'MatKhauMoi#2026' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.ok, true);

  const cu = await goi('POST', '/api/auth/login', { body: { TenDangNhap: 'tk_doi_mat_khau', MatKhau: '123456' } });
  assert.equal(cu.status, 401, 'mật khẩu cũ không còn dùng được');
  await dangNhap('tk_doi_mat_khau', 'MatKhauMoi#2026');
});

// ===================== 4. Ma trận phân quyền =====================
test('ma trận phân quyền: mỗi vai trò gọi route ngoài quyền đều bị 401/403', async () => {
  const ky = s.kyNam;
  const tokenTheoVaiTro = {
    QUAN_TRI: tok.admin,
    CHU_TRI: tok.chutri,
    LANH_DAO: tok.lanhdao,
    DAU_MOI: tok.dm_pa,
    THAM_DINH: tok.td_skhcn,
  };
  // [method, path, các vai trò ĐƯỢC phép, body]
  const ca = [
    ['GET', '/api/nguoidung', ['QUAN_TRI']],
    ['GET', '/api/nhatky', ['QUAN_TRI']],
    ['POST', '/api/nguoidung', ['QUAN_TRI'], { HoTen: 'Ma Trận', TenDangNhap: 'u_matrix', MatKhau: '123456', MaVaiTro: 'LANH_DAO' }],
    ['POST', '/api/donvi', ['CHU_TRI'], { TenDV: 'Đơn vị ma trận', MaLoaiDV: 1 }],
    ['POST', '/api/ky', ['CHU_TRI'], {}],
    ['GET', `/api/ky/${ky}`, ['CHU_TRI', 'LANH_DAO']],
    ['GET', `/api/sosanh/ky/${ky}`, ['CHU_TRI', 'LANH_DAO']],
    ['GET', `/api/dashboard/ky/${ky}`, ['CHU_TRI', 'LANH_DAO']],
    ['GET', `/api/ketqua/ky/${ky}/xuat`, ['CHU_TRI', 'LANH_DAO']],
    ['GET', '/api/thamdinh/cho', ['THAM_DINH']],
    ['POST', '/api/thamdinh/1/ketluan', ['THAM_DINH'], { KetLuan: 'DAT' }],
    ['GET', '/api/baocao/luot-giao', ['DAU_MOI']],
    ['PUT', '/api/baocao/giao/1/chiso/1', ['DAU_MOI'], { GiaTri: 1 }],
    ['POST', '/api/baocao/1/gui', ['DAU_MOI']],
    ['POST', '/api/minhchung/1/thaythe', ['DAU_MOI']],
  ];
  for (const [method, p, duocPhep, body] of ca) {
    for (const [vaiTro, tk] of Object.entries(tokenTheoVaiTro)) {
      if (duocPhep.includes(vaiTro)) continue;
      const r = await goi(method, p, { token: tk, body });
      assert.ok([401, 403].includes(r.status), `${vaiTro} gọi ${method} ${p} phải bị chặn, nhận ${r.status}: ${r.text}`);
    }
  }
});

test('ma trận phân quyền: vai trò đúng vẫn truy cập được (không chặn nhầm)', async () => {
  assert.equal((await goi('GET', '/api/nguoidung', { token: tok.admin })).status, 200);
  assert.equal((await goi('GET', '/api/nhatky', { token: tok.admin })).status, 200);
  assert.equal((await goi('GET', `/api/ky/${s.kyNam}`, { token: tok.chutri })).status, 200);
  assert.equal((await goi('GET', `/api/sosanh/ky/${s.kyNam}`, { token: tok.lanhdao })).status, 200);
  assert.equal((await goi('GET', '/api/baocao/luot-giao', { token: tok.dm_pa })).status, 200);
  assert.equal((await goi('GET', '/api/thamdinh/cho', { token: tok.td_skhcn })).status, 200);
  assert.equal((await goi('GET', `/api/ketqua/ky/${s.kyNam}/xuat`, { token: tok.lanhdao })).status, 200);
});

// ===================== 5. IDOR giữa hai đơn vị =====================
test('IDOR: đầu mối đơn vị A không đọc/sửa/gửi/tải dữ liệu của đơn vị B', async () => {
  const giaoB = await db('GIAODONVI').where({ MaKy: s.kyQ4, MaDV: s.dv.xb }).first();
  assert.ok(giaoB, 'cần lượt giao của Xã B ở kỳ quý 4');
  const bcB = await db('BAOCAOSOLIEU').where({ MaGiao: giaoB.MaGiao }).first();
  assert.ok(bcB, 'cần báo cáo nháp của Xã B');
  const mcB = await db('MINHCHUNG').where({ MaBC: bcB.MaBC }).first();
  assert.ok(mcB, 'cần minh chứng của Xã B');
  const loai = await db('LOAIMINHCHUNG').first();

  // Đối chứng: Xã B tự truy cập được dữ liệu của mình
  assert.equal((await goi('GET', `/api/baocao/giao/${giaoB.MaGiao}`, { token: tok.dm_xb })).status, 200);
  assert.equal((await goi('GET', `/api/baocao/${bcB.MaBC}`, { token: tok.dm_xb })).status, 200);
  assert.equal((await goi('GET', `/api/ketqua/giao/${giaoB.MaGiao}`, { token: tok.dm_xb })).status, 200);
  const taiCuaMinh = await goi('GET', `/api/minhchung/${mcB.MaMC}/tai`, { token: tok.dm_xb });
  assert.equal(taiCuaMinh.status, 200);

  // Phường A (đơn vị khác) bị chặn ở mọi thao tác
  const tanCong = [
    ['GET', `/api/baocao/giao/${giaoB.MaGiao}`],
    ['GET', `/api/baocao/${bcB.MaBC}`],
    ['GET', `/api/ketqua/giao/${giaoB.MaGiao}`],
    ['GET', `/api/minhchung/${mcB.MaMC}/tai`],
    ['PUT', `/api/baocao/giao/${giaoB.MaGiao}/chiso/${s.CS.CS08}`, { GiaTri: 50 }],
    ['POST', `/api/baocao/${bcB.MaBC}/gui`],
    ['POST', `/api/minhchung/${mcB.MaMC}/thaythe`],
  ];
  for (const [method, p, body] of tanCong) {
    const r = await goi(method, p, { token: tok.dm_pa, body });
    assert.equal(r.status, 403, `${method} ${p} của đơn vị khác phải 403, nhận ${r.status}: ${r.text}`);
  }

  // Tải minh chứng lên báo cáo của đơn vị khác cũng bị chặn và không để lại tệp/mẫu tin
  const soMcTruoc = Number((await db('MINHCHUNG').where({ MaBC: bcB.MaBC }).count({ n: '*' }).first()).n);
  const fd = new FormData();
  fd.append('MaLoaiMC', String(loai.MaLoaiMC));
  fd.append('tep', new Blob(['%PDF-1.4 minh chung gia mao'], { type: 'application/pdf' }), 'gia-mao.pdf');
  const up = await goi('POST', `/api/baocao/${bcB.MaBC}/minhchung`, { token: tok.dm_pa, form: fd });
  assert.equal(up.status, 403, `tải minh chứng vào báo cáo đơn vị khác phải 403, nhận ${up.status}: ${up.text}`);
  const soMcSau = Number((await db('MINHCHUNG').where({ MaBC: bcB.MaBC }).count({ n: '*' }).first()).n);
  assert.equal(soMcSau, soMcTruoc, 'không được tạo minh chứng vào báo cáo của đơn vị khác');
});

test('chuyên viên không được thẩm định báo cáo của đơn vị mình (BR18)', async () => {
  const giaoSkhcn = await db('GIAODONVI').where({ MaKy: s.kyQ3, MaDV: s.dv.skhcn }).first();
  const bcSkhcn = await db('BAOCAOSOLIEU').where({ MaGiao: giaoSkhcn.MaGiao }).first();
  // td_skhcn thuộc Sở KH&CN: kết luận báo cáo của chính Sở KH&CN phải bị chặn
  const cungDonVi = await goi('POST', `/api/thamdinh/${bcSkhcn.MaBC}/ketluan`, {
    token: tok.td_skhcn,
    body: { KetLuan: 'DAT' },
  });
  assert.equal(cungDonVi.status, 403, `thẩm định báo cáo đơn vị mình phải 403, nhận ${cungDonVi.status}: ${cungDonVi.text}`);
  // td_syt (đơn vị khác) không bị chặn bởi luật BR18 (báo cáo này đã Đạt nên chỉ vướng trạng thái 409)
  const khacDonVi = await goi('POST', `/api/thamdinh/${bcSkhcn.MaBC}/ketluan`, {
    token: tok.td_syt,
    body: { KetLuan: 'DAT' },
  });
  assert.notEqual(khacDonVi.status, 403, `đơn vị khác không được chặn bởi BR18, nhận ${khacDonVi.status}: ${khacDonVi.text}`);
});

// ===================== 6. Quản trị người dùng =====================
test('tạo người dùng: trùng tên đăng nhập 409; vai trò/đơn vị không hợp lệ 422; tạo mới 201 và ghi nhật ký', async () => {
  const trung = await goi('POST', '/api/nguoidung', {
    token: tok.admin,
    body: { HoTen: 'Trùng Tên', TenDangNhap: 'admin', MatKhau: '123456', MaVaiTro: 'LANH_DAO' },
  });
  assert.equal(trung.status, 409);

  const saiVaiTro = await goi('POST', '/api/nguoidung', {
    token: tok.admin,
    body: { HoTen: 'Sai Vai Trò', TenDangNhap: 'u_vaitro_sai', MatKhau: '123456', MaVaiTro: 'KHONG_CO' },
  });
  assert.equal(saiVaiTro.status, 422);

  const thieuDV = await goi('POST', '/api/nguoidung', {
    token: tok.admin,
    body: { HoTen: 'Thiếu Đơn Vị', TenDangNhap: 'u_thieu_dv', MatKhau: '123456', MaVaiTro: 'DAU_MOI' },
  });
  assert.equal(thieuDV.status, 422);

  const ok = await goi('POST', '/api/nguoidung', {
    token: tok.admin,
    body: { HoTen: 'Người Mới', TenDangNhap: 'u_tao_moi_1', MatKhau: '123456', MaVaiTro: 'LANH_DAO' },
  });
  assert.equal(ok.status, 201);
  assert.ok(ok.data.MaND);
  ids.uTaoMoi = ok.data.MaND;

  const moi = await db('NGUOIDUNG').where({ TenDangNhap: 'u_tao_moi_1' }).first();
  assert.ok(moi.MatKhau.startsWith('$2'), 'mật khẩu phải được băm');

  const nk = await goi('GET', '/api/nhatky?hanhDong=TAO_TAI_KHOAN', { token: tok.admin });
  assert.equal(nk.status, 200);
  assert.ok(nk.data.some((x) => String(x.DoiTuong).includes('u_tao_moi_1')), 'phải có nhật ký TAO_TAI_KHOAN');

  // Nhật ký chỉ đọc: không có API sửa, bản ghi vẫn nguyên
  const sua = await goi('PUT', `/api/nhatky/${nk.data[0].MaNK}`, { token: tok.admin, body: { HanhDong: 'SUA_LEN' } });
  assert.equal(sua.status, 404);
  const conLai = await db('NHATKY').where({ MaNK: nk.data[0].MaNK }).first();
  assert.ok(conLai && conLai.HanhDong !== 'SUA_LEN', 'nhật ký không được bị sửa qua API');
});

test('sửa vai trò người dùng: cập nhật đúng và ghi nhật ký; admin không tự bỏ quyền quản trị', async () => {
  const r = await goi('PUT', `/api/nguoidung/${ids.uTaoMoi}`, {
    token: tok.admin,
    body: { MaVaiTro: 'CHU_TRI', MaDV: s.dv.skhcn },
  });
  assert.equal(r.status, 200);
  const nd = await db('NGUOIDUNG').where({ MaND: ids.uTaoMoi }).first();
  assert.equal(nd.MaVaiTro, 'CHU_TRI');
  assert.equal(Number(nd.MaDV), Number(s.dv.skhcn));

  const nk = await goi('GET', '/api/nhatky?hanhDong=SUA_TAI_KHOAN', { token: tok.admin });
  assert.ok(nk.data.some((x) => String(x.DoiTuong).includes('u_tao_moi_1') && /vai trò/.test(String(x.DoiTuong))));

  const tuBoQuyen = await goi('PUT', `/api/nguoidung/${s.nd.admin.MaND}`, {
    token: tok.admin,
    body: { MaVaiTro: 'DAU_MOI', MaDV: s.dv.skhcn },
  });
  assert.equal(tuBoQuyen.status, 422);
  assert.equal((await db('NGUOIDUNG').where({ MaND: s.nd.admin.MaND }).first()).MaVaiTro, 'QUAN_TRI');

  const tuKhoa = await goi('PUT', `/api/nguoidung/${s.nd.admin.MaND}`, {
    token: tok.admin,
    body: { TrangThaiTK: 'KHOA' },
  });
  assert.equal(tuKhoa.status, 422);
});

// ===================== 7. Nhập tài khoản Excel =====================
test('nhập tài khoản Excel: dòng hợp lệ được tạo, dòng lỗi bị liệt kê; tệp không phải .xlsx bị chặn', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('TaiKhoan');
  ws.addRow(['Họ tên', 'Tên đăng nhập', 'Mật khẩu', 'Mã vai trò', 'Mã đơn vị', 'Email', 'Số điện thoại']);
  ws.addRow(['Excel Hợp Lệ', 'excel_ok_1', 'matkhau1', 'DAU_MOI', s.dv.pa]);
  ws.addRow(['Trùng Admin', 'admin', 'matkhau1', 'LANH_DAO', '']);
  ws.addRow(['Sai Vai Trò', 'excel_sai_vt', 'matkhau1', 'KHONG_CO', '']);
  ws.addRow(['Mật Khẩu Yếu', 'excel_yeu', '123', 'LANH_DAO', '']);
  ws.addRow(['Lặp Trong Tệp', 'excel_ok_1', 'matkhau1', 'LANH_DAO', '']);
  const buf = Buffer.from(await wb.xlsx.writeBuffer());

  const fd = new FormData();
  fd.append('tep', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'tai-khoan.xlsx');
  const r = await goi('POST', '/api/nguoidung-excel', { token: tok.admin, form: fd });
  assert.equal(r.status, 200);
  assert.equal(r.data.DaTao, 1);
  assert.deepEqual(r.data.TaiKhoan, ['excel_ok_1']);
  assert.equal(r.data.BoQua.length, 4, `phải bỏ qua 4 dòng lỗi, nhận ${JSON.stringify(r.data.BoQua)}`);
  const moi = await db('NGUOIDUNG').where({ TenDangNhap: 'excel_ok_1' }).first();
  assert.ok(moi && moi.MatKhau.startsWith('$2'));

  // Sai đuôi tệp
  const fdTxt = new FormData();
  fdTxt.append('tep', new Blob([buf]), 'tai-khoan.txt');
  assert.equal((await goi('POST', '/api/nguoidung-excel', { token: tok.admin, form: fdTxt })).status, 422);

  // Đúng đuôi nhưng nội dung không phải Excel
  const fdRac = new FormData();
  fdRac.append('tep', new Blob(['day khong phai tep excel']), 'rac.xlsx');
  const rac = await goi('POST', '/api/nguoidung-excel', { token: tok.admin, form: fdRac });
  assert.equal(rac.status, 422);
  assert.match(rac.data.message, /Không đọc được tệp/);

  // Chưa chọn tệp
  const fdRong = new FormData();
  assert.equal((await goi('POST', '/api/nguoidung-excel', { token: tok.admin, form: fdRong })).status, 422);
});

// ===================== 8. Thông báo =====================
test('thông báo: mỗi người chỉ thấy của mình; đọc tất cả không ảnh hưởng người khác', async () => {
  const gui = (maND, noiDung) => db('THONGBAO').insert({ LoaiTB: 'TEST', NoiDung: noiDung, NgayGui: new Date(), DaDoc: false, MaND: maND });
  await gui(s.nd.dm_pa.MaND, 'TB riêng cho Phường A');
  await gui(s.nd.dm_xb.MaND, 'TB riêng cho Xã B');

  const r = await goi('GET', '/api/thongbao', { token: tok.dm_pa });
  assert.equal(r.status, 200);
  assert.ok(r.data.DanhSach.length > 0);
  assert.ok(r.data.DanhSach.every((t) => t.MaND === s.nd.dm_pa.MaND), 'chỉ được thấy thông báo của chính mình');
  assert.ok(!r.data.DanhSach.some((t) => t.NoiDung === 'TB riêng cho Xã B'));

  assert.equal((await goi('POST', '/api/thongbao/doc-tat-ca', { token: tok.dm_pa })).status, 200);
  const chuaDoc = await db('THONGBAO').where({ MaND: s.nd.dm_pa.MaND, DaDoc: false }).first();
  assert.ok(!chuaDoc, 'thông báo của Phường A phải được đánh dấu đã đọc');
  const cuaXb = await db('THONGBAO').where({ MaND: s.nd.dm_xb.MaND, NoiDung: 'TB riêng cho Xã B' }).first();
  assert.equal(Boolean(Number(cuaXb.DaDoc)), false, 'không được đánh dấu đọc thông báo của người khác');
});

// ===================== 9. Rò rỉ dữ liệu =====================
test('không rò rỉ hash mật khẩu trong response', async () => {
  const ca = [
    ['GET', '/api/nguoidung', tok.admin],
    ['GET', '/api/auth/me', tok.admin],
    ['GET', '/api/auth/me', tok.dm_pa],
    ['GET', '/api/vaitro', tok.dm_pa],
  ];
  for (const [method, p, tk] of ca) {
    const r = await goi(method, p, { token: tk });
    assert.equal(r.status, 200, `${p} phải 200`);
    assert.ok(!/\$2[aby]\$/.test(r.text), `${p} lộ hash bcrypt`);
    assert.ok(!/MatKhau/.test(r.text), `${p} lộ trường MatKhau`);
  }
});

test('lỗi 500 trả thông báo chung, không lộ stack trace / tên bảng / node_modules', async () => {
  const errCu = console.error;
  console.error = () => {}; // app tự log lỗi 500; ẩn cho output test gọn
  try {
    const r = await goi('POST', '/api/nguoidung', {
      token: tok.admin,
      body: { HoTen: 'Lỗi Máy Chủ', TenDangNhap: 'u_loi_500', MatKhau: '123456', MaVaiTro: 'LANH_DAO', MaDV: { khong: 'hop_le' } },
    });
    assert.equal(r.status, 500, `kỳ vọng 500 để kiểm tra bộ xử lý lỗi, nhận ${r.status}: ${r.text}`);
    assert.equal(r.data.message, 'Lỗi máy chủ. Hãy thử lại.');
    assert.ok(!('stack' in r.data), 'response 500 không được có trường stack');
    assert.ok(!/node_modules/.test(r.text), 'không được lộ đường dẫn node_modules');
    assert.ok(!/\bat\s+[\w.]+\s+\(.*\.js:\d+/.test(r.text), 'không được lộ stack frame');
    assert.ok(!/TypeError|SqliteError|SyntaxError/.test(r.text), 'không được lộ loại lỗi nội bộ');
  } finally {
    console.error = errCu;
  }
});

// ===================== 10. Lỗi ứng dụng phát hiện được (test cố ý fail) =====================
// BUG (mức thấp): dữ liệu sai kiểu ở MaDV được đẩy thẳng xuống tầng CSDL làm phát sinh 500,
// đáng lẽ phải bị kiểm tra và trả 422 như các trường hợp sai vai trò/đơn vị khác.
// Nơi nghi ngờ: server/src/routes/hethong.js:59 (kiemTraTaiKhoan) — thiếu chuẩn hóa/kiểm tra kiểu MaDV.
test('BUG: MaDV sai kiểu phải bị từ chối 422 thay vì lỗi máy chủ 500', async () => {
  const errCu = console.error;
  console.error = () => {};
  try {
    const r = await goi('POST', '/api/nguoidung', {
      token: tok.admin,
      body: { HoTen: 'Kiểu Sai', TenDangNhap: 'u_kieu_sai', MatKhau: '123456', MaVaiTro: 'DAU_MOI', MaDV: { x: 1 } },
    });
    assert.equal(r.status, 422);
  } finally {
    console.error = errCu;
  }
});
