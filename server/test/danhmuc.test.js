// Kiểm thử danh mục (đơn vị, loại đơn vị, loại minh chứng) và bộ chỉ số theo phiên bản (UC 1.4, 1.5, 1.6).
// Chạy trên SQLite tạm theo process.pid, giống flow.test.js. Logic nằm trong route nên gọi qua app Express
// lắng nghe cổng ngẫu nhiên (port 0) trên 127.0.0.1, kèm token JWT thật của tài khoản seed.
// Test có option { todo: 'BUG: ...' } là LỖI ỨNG DỤNG đã xác nhận: test viết theo kết quả mong đợi, đang fail có chủ đích.
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs');

const tepDb = path.join(os.tmpdir(), `is028-danhmuc-${process.pid}.sqlite`);
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_FILE = tepDb;
const { db } = require('../src/db');
const { taoBang } = require('../src/schema');
const { seed } = require('../src/seed');
const bochiso = require('../src/services/bochiso');
const kySv = require('../src/services/ky');
const { xacDinhMucDo } = require('../src/lib/scoring');
const { taoToken } = require('../src/middleware/auth');

let s; let server; let base; let tk; let SO; let XA;

async function goi(method, url, body, token = tk.chutri) {
  const res = await fetch(base + url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}
const coLoi = (r, status, mau) => {
  assert.equal(r.status, status, `mong đợi ${status}, nhận ${r.status}: ${JSON.stringify(r.data)}`);
  if (mau) assert.match(r.data.message, mau);
};

// Tạo nhanh một bộ Nháp hợp lệ để ban hành: 1 nhóm 100%, 1 chỉ số có/không, 1 mức độ phủ 0-100
async function taoBoNhap(ten = 'Bộ thử', { trongSo = 100, loai } = {}) {
  const { data: { MaBo } } = await goi('POST', '/bochiso', { TenBo: ten });
  const { data: { MaNhom } } = await goi('POST', `/bochiso/${MaBo}/nhom`, { TenNhom: 'Nhóm 1', TrongSo: trongSo });
  const r = await goi('POST', `/nhom/${MaNhom}/chiso`, { TenChiSo: 'CS thử', KieuCongThuc: 'CO_KHONG', DiemToiDa: 10, TanSuat: 'NAM', LoaiDonVi: loai || [SO, XA] });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  await goi('PUT', `/bochiso/${MaBo}/mucdo`, { MucDo: [{ TenMucDo: 'Tất cả', DiemTu: 0, DiemDen: 100 }] });
  return { MaBo, MaNhom, MaChiSo: r.data.MaChiSo };
}
const chiSoTyLe = (x = {}) => ({ TenChiSo: 'Tỷ lệ thử', KieuCongThuc: 'TY_LE', DiemToiDa: 10, ChiTieu: 80, GiaTriMin: 0, GiaTriMax: 100, TanSuat: 'QUY', LoaiDonVi: [SO], ...x });

test.before(async () => {
  await taoBang(db);
  s = await seed(db);
  tk = Object.fromEntries(['chutri', 'admin', 'dm_xb', 'lanhdao'].map((k) => [k, taoToken(s.nd[k])]));
  SO = (await db('DONVI').where({ MaDV: s.dv.skhcn }).first()).MaLoaiDV;
  XA = (await db('DONVI').where({ MaDV: s.dv.xb }).first()).MaLoaiDV;
  const app = require('../src/app');
  server = await new Promise((ok) => { const x = app.listen(0, '127.0.0.1', () => ok(x)); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
test.after(async () => {
  await new Promise((ok) => server.close(ok));
  await db.destroy();
  fs.rmSync(tepDb, { force: true });
});

// ============ Phân quyền ============
test('PQ: chỉ Cán bộ chủ trì được ghi danh mục; vai trò khác 403, không token 401', async () => {
  coLoi(await goi('POST', '/donvi', { TenDV: 'X', MaLoaiDV: SO }, tk.admin), 403);
  coLoi(await goi('POST', '/loaiminhchung', { TenLoaiMC: 'X' }, tk.dm_xb), 403);
  coLoi(await goi('POST', '/bochiso', { TenBo: 'X' }, tk.lanhdao), 403);
  coLoi(await goi('PUT', `/bochiso/${s.maBo}/mucdo`, { MucDo: [] }, tk.dm_xb), 403);
  const r = await fetch(`${base}/donvi`);
  assert.equal(r.status, 401);
  // đọc danh mục thì mọi vai trò đăng nhập đều được
  assert.equal((await goi('GET', '/donvi', undefined, tk.dm_xb)).status, 200);
});

// ============ Loại đơn vị ============
test('LDV: danh sách loại đơn vị có 2 loại seed', async () => {
  const r = await goi('GET', '/loaidonvi');
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.map((x) => x.MaLoaiDV).sort(), [SO, XA].sort());
});

test('LDV: thêm/sửa/xóa loại đơn vị qua API', { todo: 'BUG-01: không có API POST/PUT/DELETE /loaidonvi (trả 404)' }, async () => {
  const r = await goi('POST', '/loaidonvi', { TenLoaiDV: 'Doanh nghiệp nhà nước' });
  assert.equal(r.status, 201, JSON.stringify(r.data));
});

// ============ Đơn vị ============
test('DV: thêm đơn vị hợp lệ; thiếu tên / tên toàn khoảng trắng / loại sai bị 422', async () => {
  const r = await goi('POST', '/donvi', { TenDV: '  Sở Tài chính  ', Email: 'stc@example.gov.vn', MaLoaiDV: SO });
  assert.equal(r.status, 201);
  const dv = await db('DONVI').where({ MaDV: r.data.MaDV }).first();
  assert.equal(dv.TenDV, 'Sở Tài chính'); // đã trim
  coLoi(await goi('POST', '/donvi', { MaLoaiDV: SO }), 422, /Thiếu tên/);
  coLoi(await goi('POST', '/donvi', { TenDV: '   ', MaLoaiDV: SO }), 422, /Thiếu tên/);
  coLoi(await goi('POST', '/donvi', { TenDV: 'X', MaLoaiDV: 9999 }), 422, /Loại đơn vị không hợp lệ/);
});

test('DV: thiếu MaLoaiDV phải trả 422, không phải 500', { todo: 'BUG-07: where({ MaLoaiDV: undefined }) -> knex "Undefined binding(s)" -> 500 "Lỗi máy chủ"' }, async () => {
  coLoi(await goi('POST', '/donvi', { TenDV: 'X' }), 422, /Loại đơn vị không hợp lệ/);
  coLoi(await goi('PUT', `/donvi/${s.dv.xb}`, { TenDV: 'X' }), 422, /Loại đơn vị không hợp lệ/);
});

test('DV: thêm đơn vị trùng tên với đơn vị đã có phải bị chặn', { todo: 'BUG-02: trùng tên đơn vị vẫn tạo thành công (201)' }, async () => {
  const daCo = await db('DONVI').where({ MaDV: s.dv.xb }).first();
  const r = await goi('POST', '/donvi', { TenDV: daCo.TenDV, MaLoaiDV: daCo.MaLoaiDV });
  if (r.status === 201) await db('DONVI').where({ MaDV: r.data.MaDV }).del(); // dọn để không ảnh hưởng test khác
  assert.ok([409, 422].includes(r.status), `nhận ${r.status}`);
});

test('DV: sửa tên được; đổi loại khi đã giao vào kỳ bị 409; đổi loại khi chưa giao được', async () => {
  const xb = await db('DONVI').where({ MaDV: s.dv.xb }).first();
  assert.equal((await goi('PUT', `/donvi/${s.dv.xb}`, { TenDV: 'UBND Xã B (mới)', Email: xb.Email, MaLoaiDV: xb.MaLoaiDV })).status, 200);
  assert.equal((await db('DONVI').where({ MaDV: s.dv.xb }).first()).TenDV, 'UBND Xã B (mới)');
  await goi('PUT', `/donvi/${s.dv.xb}`, { TenDV: xb.TenDV, Email: xb.Email, MaLoaiDV: xb.MaLoaiDV });
  coLoi(await goi('PUT', `/donvi/${s.dv.xb}`, { TenDV: xb.TenDV, MaLoaiDV: SO }), 409, /không đổi được loại/);
  const { data: { MaDV } } = await goi('POST', '/donvi', { TenDV: 'Đơn vị đổi loại', MaLoaiDV: SO });
  assert.equal((await goi('PUT', `/donvi/${MaDV}`, { TenDV: 'Đơn vị đổi loại', MaLoaiDV: XA })).status, 200);
  assert.equal((await db('DONVI').where({ MaDV }).first()).MaLoaiDV, XA);
  coLoi(await goi('PUT', '/donvi/999999', { TenDV: 'X', MaLoaiDV: SO }), 404);
});

test('DV: xóa đơn vị đã giao vào kỳ (BR24) hoặc còn tài khoản bị 409; đơn vị mới xóa được', async () => {
  coLoi(await goi('DELETE', `/donvi/${s.dv.xb}`), 409, /BR24/);
  // đơn vị có tài khoản nhưng chưa giao: tạo đơn vị + tài khoản trực tiếp
  const { data: { MaDV } } = await goi('POST', '/donvi', { TenDV: 'Đơn vị có tài khoản', MaLoaiDV: XA });
  await db('NGUOIDUNG').insert({ TenDangNhap: 'tk_dv_moi', MatKhau: 'x', HoTen: 'TK', MaVaiTro: 'DAU_MOI', TrangThaiTK: 'HOAT_DONG', MaDV });
  coLoi(await goi('DELETE', `/donvi/${MaDV}`), 409, /tài khoản/);
  const moi = await goi('POST', '/donvi', { TenDV: 'Đơn vị để xóa', MaLoaiDV: XA });
  assert.equal((await goi('DELETE', `/donvi/${moi.data.MaDV}`)).status, 200);
  assert.equal(await db('DONVI').where({ MaDV: moi.data.MaDV }).first(), undefined);
});

test('DV: xóa đơn vị không tồn tại phải trả 404', { todo: 'BUG-03: DELETE /donvi/:id với id không tồn tại vẫn trả 200 ok' }, async () => {
  coLoi(await goi('DELETE', '/donvi/999999'), 404);
});

// ============ Loại minh chứng ============
test('LMC: thêm, sửa, xóa loại chưa dùng; thiếu tên 422; xóa loại đã dùng 409 (BR24)', async () => {
  const r = await goi('POST', '/loaiminhchung', { TenLoaiMC: '  Ảnh chụp màn hình ' });
  assert.equal(r.status, 201);
  assert.equal((await db('LOAIMINHCHUNG').where({ MaLoaiMC: r.data.MaLoaiMC }).first()).TenLoaiMC, 'Ảnh chụp màn hình');
  coLoi(await goi('POST', '/loaiminhchung', { TenLoaiMC: '  ' }), 422, /Thiếu tên/);
  coLoi(await goi('POST', '/loaiminhchung', {}), 422, /Thiếu tên/);
  assert.equal((await goi('PUT', `/loaiminhchung/${r.data.MaLoaiMC}`, { TenLoaiMC: 'Ảnh chụp' })).status, 200);
  assert.equal((await db('LOAIMINHCHUNG').where({ MaLoaiMC: r.data.MaLoaiMC }).first()).TenLoaiMC, 'Ảnh chụp');
  coLoi(await goi('PUT', `/loaiminhchung/${r.data.MaLoaiMC}`, { TenLoaiMC: '' }), 422);
  assert.equal((await goi('DELETE', `/loaiminhchung/${r.data.MaLoaiMC}`)).status, 200);
  const daDung = await db('MINHCHUNG').first();
  assert.ok(daDung, 'seed phải có minh chứng');
  coLoi(await goi('DELETE', `/loaiminhchung/${daDung.MaLoaiMC}`), 409, /BR24/);
});

test('LMC: thêm loại minh chứng trùng tên phải bị chặn', { todo: 'BUG-02: trùng tên loại minh chứng vẫn tạo thành công (201)' }, async () => {
  const daCo = await db('LOAIMINHCHUNG').first();
  const r = await goi('POST', '/loaiminhchung', { TenLoaiMC: daCo.TenLoaiMC });
  if (r.status === 201) await db('LOAIMINHCHUNG').where({ MaLoaiMC: r.data.MaLoaiMC }).del();
  assert.ok([409, 422].includes(r.status), `nhận ${r.status}`);
});

test('LMC: sửa loại minh chứng không tồn tại phải trả 404', { todo: 'BUG-03: PUT /loaiminhchung/:id với id không tồn tại trả 200 ok' }, async () => {
  coLoi(await goi('PUT', '/loaiminhchung/999999', { TenLoaiMC: 'X' }), 404);
});

// ============ Bộ chỉ số: tạo, sửa, xóa ============
test('BCS: tạo bộ ở trạng thái Nháp; thiếu tên 422; sửa bộ Nháp được', async () => {
  const r = await goi('POST', '/bochiso', { TenBo: '  Bộ 2027 ', CanCuPhapLy: 'QĐ 1' });
  assert.equal(r.status, 201);
  const bo = await db('BOCHISO').where({ MaBo: r.data.MaBo }).first();
  assert.equal(bo.TrangThaiBo, 'NHAP');
  assert.equal(bo.TenBo, 'Bộ 2027');
  coLoi(await goi('POST', '/bochiso', { TenBo: ' ' }), 422);
  assert.equal((await goi('PUT', `/bochiso/${r.data.MaBo}`, { TenBo: 'Bộ 2027 sửa', CanCuPhapLy: '' })).status, 200);
  const sau = await db('BOCHISO').where({ MaBo: r.data.MaBo }).first();
  assert.equal(sau.TenBo, 'Bộ 2027 sửa');
  assert.equal(sau.CanCuPhapLy, null);
  coLoi(await goi('PUT', `/bochiso/${r.data.MaBo}`, { TenBo: '' }), 422);
  coLoi(await goi('GET', '/bochiso/999999'), 404);
});

test('BCS: xóa bộ Nháp xóa sạch nhóm, chỉ số, bậc điểm, loại áp dụng, mức độ; bộ Ban hành không xóa được', async () => {
  const maBo = await bochiso.saoChep(db, s.maBo, 'Bộ để xóa');
  const bo = await bochiso.layBo(db, maBo);
  const maCS = bo.Nhom.flatMap((n) => n.ChiSo.map((c) => c.MaChiSo));
  assert.equal((await goi('DELETE', `/bochiso/${maBo}`)).status, 200);
  assert.equal(await db('BOCHISO').where({ MaBo: maBo }).first(), undefined);
  assert.equal((await db('NHOMCHISO').where({ MaBo: maBo })).length, 0);
  assert.equal((await db('MUCDOCHUYENDOISO').where({ MaBo: maBo })).length, 0);
  assert.equal((await db('CHISO').whereIn('MaChiSo', maCS)).length, 0);
  assert.equal((await db('BACDIEM').whereIn('MaChiSo', maCS)).length, 0);
  assert.equal((await db('CHISO_LOAIDONVI').whereIn('MaChiSo', maCS)).length, 0);
  coLoi(await goi('DELETE', `/bochiso/${s.maBo}`), 409, /đã khóa/);
  assert.ok(await db('BOCHISO').where({ MaBo: s.maBo }).first());
  coLoi(await goi('DELETE', '/bochiso/999999'), 404);
});

// ============ Sao chép (BR14) ============
test('BCS: sao chép giữ đủ nhóm, chỉ số (mọi trường), bậc điểm, loại đơn vị, mức độ; bộ nguồn không đổi (BR14)', async () => {
  const nguonTruoc = await bochiso.layBo(db, s.maBo);
  const r = await goi('POST', `/bochiso/${s.maBo}/saochep`, { TenBo: 'Bộ 2026 bản sao' });
  assert.equal(r.status, 201);
  const moi = await bochiso.layBo(db, r.data.MaBo);
  assert.equal(moi.TrangThaiBo, 'NHAP');
  assert.equal(moi.NgayBanHanh, null);
  assert.equal(moi.TenBo, 'Bộ 2026 bản sao');
  assert.equal(moi.CanCuPhapLy, nguonTruoc.CanCuPhapLy);
  const boKhoa = (o, ...k) => { const x = { ...o }; for (const t of k) delete x[t]; return x; };
  const chuanHoa = (bo) => ({
    Nhom: bo.Nhom.map((n) => ({
      ...boKhoa(n, 'MaNhom', 'MaBo'),
      ChiSo: n.ChiSo.map((c) => ({
        ...boKhoa(c, 'MaChiSo', 'MaNhom'),
        BacDiem: c.BacDiem.map((b) => boKhoa(b, 'MaBac', 'MaChiSo')),
        LoaiDonVi: [...c.LoaiDonVi].sort(),
      })),
    })),
    MucDo: bo.MucDo.map((m) => boKhoa(m, 'MaMucDo', 'MaBo')),
  });
  assert.deepEqual(chuanHoa(moi), chuanHoa(nguonTruoc));
  // khóa mới, không dùng chung bản ghi con với bộ nguồn
  const idNguon = new Set(nguonTruoc.Nhom.map((n) => n.MaNhom));
  assert.ok(moi.Nhom.every((n) => !idNguon.has(n.MaNhom)));
  assert.deepEqual(await bochiso.layBo(db, s.maBo), nguonTruoc);
  // tên trống thì dùng tên gợi ý
  const r2 = await goi('POST', `/bochiso/${s.maBo}/saochep`, {});
  assert.equal((await db('BOCHISO').where({ MaBo: r2.data.MaBo }).first()).TenBo, `${nguonTruoc.TenBo} (bản sao)`);
  coLoi(await goi('POST', '/bochiso/999999/saochep', {}), 404);
});

test('BCS: sao chép với tên toàn khoảng trắng phải dùng tên gợi ý hoặc bị 422', { todo: 'BUG-04: saochep lưu TenBo "   " (không trim/kiểm tra như POST /bochiso)' }, async () => {
  const r = await goi('POST', `/bochiso/${s.maBo}/saochep`, { TenBo: '   ' });
  if (r.status === 201) {
    const ten = (await db('BOCHISO').where({ MaBo: r.data.MaBo }).first()).TenBo;
    assert.ok(ten.trim().length > 0, `TenBo lưu là "${ten}"`);
  } else assert.equal(r.status, 422);
});

// ============ Ban hành (RB08, RB09, RB05) ============
test('BH: ban hành bộ hợp lệ -> BAN_HANH, có NgayBanHanh, ghi nhật ký; ban hành lại 409', async () => {
  const { MaBo } = await taoBoNhap('Bộ ban hành');
  const r = await goi('POST', `/bochiso/${MaBo}/banhanh`);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const bo = await db('BOCHISO').where({ MaBo }).first();
  assert.equal(bo.TrangThaiBo, 'BAN_HANH');
  assert.ok(bo.NgayBanHanh);
  assert.ok(await db('NHATKY').where({ HanhDong: 'BAN_HANH_BO' }).andWhere('DoiTuong', 'like', `%#${MaBo} %`).first());
  coLoi(await goi('POST', `/bochiso/${MaBo}/banhanh`), 409, /đã khóa/);
});

test('BH: tổng trọng số nhóm khác 100 bị chặn (RB08), kể cả 99,99 và 100,01; tổng lẻ đúng 100 thì đạt', async () => {
  for (const [ts, dat] of [[[60, 30], false], [[60, 50], false], [[50, 49.99], false], [[50, 50.01], false], [[33.33, 33.33, 33.34], true]]) {
    const { data: { MaBo } } = await goi('POST', '/bochiso', { TenBo: `RB08 ${ts.join('+')}` });
    for (const [i, t] of ts.entries()) {
      const { data: { MaNhom } } = await goi('POST', `/bochiso/${MaBo}/nhom`, { TenNhom: `N${i}`, TrongSo: t });
      await goi('POST', `/nhom/${MaNhom}/chiso`, { TenChiSo: `C${i}`, KieuCongThuc: 'CO_KHONG', DiemToiDa: 5, TanSuat: 'NAM', LoaiDonVi: [SO] });
    }
    await goi('PUT', `/bochiso/${MaBo}/mucdo`, { MucDo: [{ TenMucDo: 'A', DiemTu: 0, DiemDen: 100 }] });
    const r = await goi('POST', `/bochiso/${MaBo}/banhanh`);
    if (dat) assert.equal(r.status, 200, `${ts}: ${JSON.stringify(r.data)}`);
    else {
      coLoi(r, 422);
      assert.ok(r.data.chiTiet.some((x) => /RB08/.test(x)), `${ts}: ${JSON.stringify(r.data.chiTiet)}`);
    }
  }
});

test('BH: bộ rỗng / nhóm rỗng / chỉ số chưa áp dụng loại đơn vị / bậc thang thiếu bậc đều bị liệt kê lỗi', async () => {
  const { data: { MaBo } } = await goi('POST', '/bochiso', { TenBo: 'Bộ rỗng' });
  let r = await goi('POST', `/bochiso/${MaBo}/banhanh`);
  coLoi(r, 422);
  assert.ok(r.data.chiTiet.some((x) => /chưa có nhóm/.test(x)));
  assert.ok(r.data.chiTiet.some((x) => /chưa khai báo ngưỡng/.test(x)));
  const { data: { MaNhom } } = await goi('POST', `/bochiso/${MaBo}/nhom`, { TenNhom: 'Nhóm A', TrongSo: 60 });
  const { data: { MaNhom: nhomRong } } = await goi('POST', `/bochiso/${MaBo}/nhom`, { TenNhom: 'Nhóm rỗng', TrongSo: 40 });
  await goi('POST', `/nhom/${MaNhom}/chiso`, { TenChiSo: 'Không áp dụng', KyHieu: 'X1', KieuCongThuc: 'CO_KHONG', DiemToiDa: 5, TanSuat: 'NAM', LoaiDonVi: [] });
  await goi('POST', `/nhom/${MaNhom}/chiso`, { TenChiSo: 'Bậc trống', KyHieu: 'X2', KieuCongThuc: 'BAC_THANG', DiemToiDa: 5, GiaTriMax: 10, TanSuat: 'NAM', LoaiDonVi: [SO], BacDiem: [] });
  await goi('PUT', `/bochiso/${MaBo}/mucdo`, { MucDo: [{ TenMucDo: 'A', DiemTu: 0, DiemDen: 100 }] });
  r = await goi('POST', `/bochiso/${MaBo}/banhanh`);
  coLoi(r, 422);
  const ct = r.data.chiTiet.join(' | ');
  assert.match(ct, /Nhóm rỗng" chưa có chỉ số/);
  assert.match(ct, /X1 chưa áp dụng cho loại đơn vị/);
  assert.match(ct, /X2: kiểu bậc thang cần ít nhất một bậc/);
  assert.doesNotMatch(ct, /RB08/);
  assert.equal((await db('BOCHISO').where({ MaBo }).first()).TrangThaiBo, 'NHAP');
  assert.ok(nhomRong);
});

test('BH: bậc điểm chồng khoảng (RB09), bậc giữa không có cận trên, điểm bậc vượt điểm tối đa đều bị chặn khi ban hành', async () => {
  for (const [bacs, mau] of [
    [[{ TuGiaTri: 0, DenGiaTri: 10, Diem: 1 }, { TuGiaTri: 5, DenGiaTri: 20, Diem: 2 }], /chồng khoảng/],
    [[{ TuGiaTri: 0, DenGiaTri: 10, Diem: 1 }, { TuGiaTri: 10, DenGiaTri: null, Diem: 2 }], /chồng khoảng/], // biên chung 10 thuộc cả hai bậc
    [[{ TuGiaTri: 0, DenGiaTri: null, Diem: 1 }, { TuGiaTri: 5, DenGiaTri: null, Diem: 2 }], /chồng khoảng/],
    [[{ TuGiaTri: 0, DenGiaTri: null, Diem: 50 }], /điểm của bậc/],
  ]) {
    const { MaBo, MaNhom } = await taoBoNhap('Bậc thang');
    await goi('POST', `/nhom/${MaNhom}/chiso`, { TenChiSo: 'Bậc', KyHieu: 'B1', KieuCongThuc: 'BAC_THANG', DiemToiDa: 10, GiaTriMax: 100, TanSuat: 'NAM', LoaiDonVi: [SO], BacDiem: bacs });
    const r = await goi('POST', `/bochiso/${MaBo}/banhanh`);
    coLoi(r, 422);
    assert.ok(r.data.chiTiet.some((x) => mau.test(x)), JSON.stringify(r.data.chiTiet));
  }
});

// ============ Ngừng hiệu lực ============
test('NHL: chỉ ngừng được bộ Ban hành; còn kỳ Nháp/Đang mở thì chặn; ngừng xong không tạo kỳ mới, không sửa, không xóa', async () => {
  const { MaBo } = await taoBoNhap('Bộ ngừng');
  coLoi(await goi('POST', `/bochiso/${MaBo}/ngunghieuluc`), 409, /đang Ban hành/);
  await goi('POST', `/bochiso/${MaBo}/banhanh`);
  coLoi(await goi('POST', `/bochiso/${s.maBo}/ngunghieuluc`), 409, /Còn kỳ/); // seed còn kỳ Đang mở
  const maKy = await kySv.taoKy(db, { TenKy: 'Kỳ thử ngừng', LoaiKy: 'NAM', NgayBatDau: '2030-01-01', NgayKetThuc: '2030-12-31', HanNop: '2030-12-31', NgayChot: '2031-01-31', MaBo });
  coLoi(await goi('POST', `/bochiso/${MaBo}/ngunghieuluc`), 409, /Còn kỳ/);
  await db('KYDANHGIA').where({ MaKy: maKy }).update({ TrangThaiKy: 'DA_CHOT' });
  assert.equal((await goi('POST', `/bochiso/${MaBo}/ngunghieuluc`)).status, 200);
  assert.equal((await db('BOCHISO').where({ MaBo }).first()).TrangThaiBo, 'HET_HIEU_LUC');
  coLoi(await goi('POST', `/bochiso/${MaBo}/ngunghieuluc`), 409);
  await assert.rejects(() => kySv.taoKy(db, { TenKy: 'Kỳ sau ngừng', LoaiKy: 'NAM', NgayBatDau: '2031-01-01', NgayKetThuc: '2031-12-31', HanNop: '2031-12-31', NgayChot: '2032-01-31', MaBo }), /đã ban hành/);
  coLoi(await goi('PUT', `/bochiso/${MaBo}`, { TenBo: 'Sửa' }), 409, /đã khóa/);
  coLoi(await goi('DELETE', `/bochiso/${MaBo}`), 409);
  coLoi(await goi('POST', '/bochiso/999999/ngunghieuluc'), 409);
});

// ============ RB13: bộ đã ban hành bị khóa ============
test('RB13: bộ Ban hành khóa sửa bộ, thêm/sửa/xóa nhóm, thêm/sửa/xóa chỉ số, ghi mức độ', async () => {
  const bo = await bochiso.layBo(db, s.maBo);
  const nhom = bo.Nhom[0];
  const cs = nhom.ChiSo[0];
  const truoc = JSON.stringify(bo);
  const ds = [
    await goi('PUT', `/bochiso/${s.maBo}`, { TenBo: 'Đổi tên' }),
    await goi('POST', `/bochiso/${s.maBo}/nhom`, { TenNhom: 'Mới', TrongSo: 5 }),
    await goi('PUT', `/nhom/${nhom.MaNhom}`, { TenNhom: nhom.TenNhom, TrongSo: 20 }),
    await goi('DELETE', `/nhom/${nhom.MaNhom}`),
    await goi('POST', `/nhom/${nhom.MaNhom}/chiso`, { TenChiSo: 'Mới', KieuCongThuc: 'CO_KHONG', DiemToiDa: 1, TanSuat: 'NAM', LoaiDonVi: [SO] }),
    await goi('PUT', `/chiso/${cs.MaChiSo}`, { ...cs, DiemToiDa: 99 }),
    await goi('DELETE', `/chiso/${cs.MaChiSo}`),
    await goi('PUT', `/bochiso/${s.maBo}/mucdo`, { MucDo: [{ TenMucDo: 'A', DiemTu: 0, DiemDen: 100 }] }),
  ];
  ds.forEach((r, i) => coLoi(r, 409, /đã khóa/, i));
  assert.equal(JSON.stringify(await bochiso.layBo(db, s.maBo)), truoc);
});

// ============ Nhóm chỉ số ============
test('NHOM: thêm/sửa nhóm; trọng số ≤0, >100, không phải số, thiếu tên bị 422; biên 100 được', async () => {
  const { data: { MaBo } } = await goi('POST', '/bochiso', { TenBo: 'Bộ nhóm' });
  const r = await goi('POST', `/bochiso/${MaBo}/nhom`, { TenNhom: ' Nhóm A ', TrongSo: '100' });
  assert.equal(r.status, 201);
  const n = await db('NHOMCHISO').where({ MaNhom: r.data.MaNhom }).first();
  assert.equal(n.TenNhom, 'Nhóm A');
  assert.equal(Number(n.TrongSo), 100);
  for (const ts of [0, -5, 100.01, 101, 'abc', '', null]) {
    coLoi(await goi('POST', `/bochiso/${MaBo}/nhom`, { TenNhom: 'X', TrongSo: ts }), 422, /Trọng số/);
  }
  coLoi(await goi('POST', `/bochiso/${MaBo}/nhom`, { TrongSo: 10 }), 422, /Thiếu tên nhóm/);
  assert.equal((await goi('PUT', `/nhom/${r.data.MaNhom}`, { TenNhom: 'Nhóm B', TrongSo: 0.5 })).status, 200);
  assert.equal(Number((await db('NHOMCHISO').where({ MaNhom: r.data.MaNhom }).first()).TrongSo), 0.5);
  coLoi(await goi('PUT', `/nhom/${r.data.MaNhom}`, { TenNhom: 'Nhóm B', TrongSo: 0 }), 422);
  coLoi(await goi('PUT', '/nhom/999999', { TenNhom: 'X', TrongSo: 1 }), 404);
  coLoi(await goi('POST', '/bochiso/999999/nhom', { TenNhom: 'X', TrongSo: 1 }), 404);
});

test('NHOM: xóa nhóm còn chỉ số bị 409; nhóm rỗng xóa được', async () => {
  const { MaNhom, MaBo } = await taoBoNhap('Bộ xóa nhóm');
  coLoi(await goi('DELETE', `/nhom/${MaNhom}`), 409, /còn chỉ số/);
  const { data } = await goi('POST', `/bochiso/${MaBo}/nhom`, { TenNhom: 'Rỗng', TrongSo: 1 });
  assert.equal((await goi('DELETE', `/nhom/${data.MaNhom}`)).status, 200);
  assert.equal(await db('NHOMCHISO').where({ MaNhom: data.MaNhom }).first(), undefined);
  coLoi(await goi('DELETE', '/nhom/999999'), 404);
});

// ============ Chỉ số ============
test('CS: tham số công thức sai bị 422 (RB01, RB05, RB06)', async () => {
  const { MaNhom } = await taoBoNhap('Bộ chỉ số sai');
  const sai = [
    [{ TenChiSo: '' }, /Thiếu tên/],
    [{ KieuCongThuc: 'LUY_TIEN' }, /Kiểu công thức/],
    [{ TanSuat: 'THANG' }, /Tần suất/],
    [{ TanSuat: undefined }, /Tần suất/],
    [{ ChieuTot: 'GIUA_TOT' }, /Chiều tốt/],
    [{ DiemToiDa: 0 }, /Điểm tối đa/],
    [{ DiemToiDa: -1 }, /Điểm tối đa/],
    [{ DiemToiDa: 'abc' }, /Điểm tối đa/],
    [{ GiaTriMin: 50, GiaTriMax: 10 }, /Miền giá trị/],
    [{ GiaTriMax: '' }, /Miền giá trị/],
    [{ ChiTieu: null }, /Chỉ tiêu/],
    [{ ChiTieu: 0 }, /Chỉ tiêu/],
    [{ ChiTieu: 150 }, /Chỉ tiêu/],
    [{ ChiTieu: 5, GiaTriMin: 10 }, /Chỉ tiêu/],
    [{ KieuCongThuc: 'BAC_THANG', BacDiem: [{ TuGiaTri: 10, DenGiaTri: 5, Diem: 1 }] }, /Bậc điểm/],
    [{ KieuCongThuc: 'BAC_THANG', BacDiem: [{ TuGiaTri: '', DenGiaTri: 5, Diem: 1 }] }, /Bậc điểm/],
    [{ KieuCongThuc: 'BAC_THANG', BacDiem: [{ TuGiaTri: 0, DenGiaTri: 5 }] }, /Bậc điểm/],
  ];
  for (const [x, mau] of sai) coLoi(await goi('POST', `/nhom/${MaNhom}/chiso`, chiSoTyLe(x)), 422, mau);
  coLoi(await goi('POST', '/nhom/999999/chiso', chiSoTyLe()), 404);
});

test('CS: có/không ép miền 0..1, bỏ chỉ tiêu; tỷ lệ bỏ bậc điểm; loại đơn vị trùng được gộp', async () => {
  const { MaNhom } = await taoBoNhap('Bộ chỉ số đúng');
  const r1 = await goi('POST', `/nhom/${MaNhom}/chiso`, { TenChiSo: 'Có/không', KieuCongThuc: 'CO_KHONG', DiemToiDa: 5, ChiTieu: 9, GiaTriMin: 3, GiaTriMax: 7, TanSuat: 'QUY', LoaiDonVi: [SO, SO, String(XA)] });
  assert.equal(r1.status, 201, JSON.stringify(r1.data));
  const c1 = await db('CHISO').where({ MaChiSo: r1.data.MaChiSo }).first();
  assert.deepEqual([Number(c1.GiaTriMin), Number(c1.GiaTriMax), c1.ChiTieu, c1.ChieuTot], [0, 1, null, 'CAO_TOT']);
  const ld = (await db('CHISO_LOAIDONVI').where({ MaChiSo: r1.data.MaChiSo })).map((x) => x.MaLoaiDV).sort();
  assert.deepEqual(ld, [SO, XA].sort());
  const r2 = await goi('POST', `/nhom/${MaNhom}/chiso`, chiSoTyLe({ BacDiem: [{ TuGiaTri: 0, DenGiaTri: 1, Diem: 1 }] }));
  assert.equal(r2.status, 201);
  assert.equal((await db('BACDIEM').where({ MaChiSo: r2.data.MaChiSo })).length, 0);
});

test('CS: sửa chỉ số đổi kiểu bậc thang -> tỷ lệ xóa bậc điểm cũ, thay loại áp dụng; xóa chỉ số dọn bảng con', async () => {
  const { MaNhom } = await taoBoNhap('Bộ sửa chỉ số');
  const bac = { TenChiSo: 'Bậc', KieuCongThuc: 'BAC_THANG', DiemToiDa: 10, GiaTriMax: 100, TanSuat: 'NAM', LoaiDonVi: [SO, XA], BacDiem: [{ TuGiaTri: 0, DenGiaTri: 9, Diem: 0 }, { TuGiaTri: 10, DenGiaTri: '', Diem: 10 }] };
  const { data: { MaChiSo } } = await goi('POST', `/nhom/${MaNhom}/chiso`, bac);
  const bacs = await db('BACDIEM').where({ MaChiSo }).orderBy('TuGiaTri');
  assert.equal(bacs.length, 2);
  assert.equal(bacs[1].DenGiaTri, null); // '' = không giới hạn trên
  assert.equal((await goi('PUT', `/chiso/${MaChiSo}`, chiSoTyLe({ LoaiDonVi: [XA] }))).status, 200);
  const c = await db('CHISO').where({ MaChiSo }).first();
  assert.equal(c.KieuCongThuc, 'TY_LE');
  assert.equal(c.TanSuat, 'QUY');
  assert.equal((await db('BACDIEM').where({ MaChiSo })).length, 0);
  assert.deepEqual((await db('CHISO_LOAIDONVI').where({ MaChiSo })).map((x) => x.MaLoaiDV), [XA]);
  coLoi(await goi('PUT', `/chiso/${MaChiSo}`, chiSoTyLe({ ChiTieu: 0 })), 422);
  coLoi(await goi('PUT', '/chiso/999999', chiSoTyLe()), 404);
  await goi('PUT', `/chiso/${MaChiSo}`, bac);
  assert.equal((await goi('DELETE', `/chiso/${MaChiSo}`)).status, 200);
  assert.equal(await db('CHISO').where({ MaChiSo }).first(), undefined);
  assert.equal((await db('BACDIEM').where({ MaChiSo })).length, 0);
  assert.equal((await db('CHISO_LOAIDONVI').where({ MaChiSo })).length, 0);
  coLoi(await goi('DELETE', '/chiso/999999'), 404);
});

test('CS: loại đơn vị áp dụng không tồn tại phải bị 422, không phải lỗi máy chủ 500', { todo: 'BUG-05: LoaiDonVi [9999] hoặc ["abc"] gây lỗi khóa ngoại/NOT NULL -> 500 "Lỗi máy chủ"' }, async () => {
  const { MaNhom } = await taoBoNhap('Bộ loại sai');
  const r1 = await goi('POST', `/nhom/${MaNhom}/chiso`, chiSoTyLe({ LoaiDonVi: [9999] }));
  const r2 = await goi('POST', `/nhom/${MaNhom}/chiso`, chiSoTyLe({ LoaiDonVi: ['abc'] }));
  assert.deepEqual([r1.status, r2.status], [422, 422]);
});

// ============ Áp dụng theo loại đơn vị (BR03) và tần suất (BR04) ============
test('BR03/BR04: tập chỉ số áp dụng theo loại đơn vị và tần suất kỳ (dữ liệu seed)', async () => {
  const kyNam = await kySv.layKy(db, s.kyNam);
  const kyQuy = await kySv.layKy(db, s.kyQ4);
  const kh = async (ky, loai) => (await kySv.chiSoApDung(db, ky, loai)).map((c) => c.KyHieu).sort();
  assert.deepEqual(await kh(kyNam, SO), ['CS01', 'CS02', 'CS03', 'CS04', 'CS05', 'CS06', 'CS07', 'CS09', 'CS15']);
  assert.deepEqual(await kh(kyNam, XA), ['CS01', 'CS02', 'CS03', 'CS04', 'CS05', 'CS06', 'CS07', 'CS13', 'CS14']);
  assert.deepEqual(await kh(kyQuy, SO), ['CS08', 'CS10', 'CS11', 'CS12']);
  assert.deepEqual(await kh(kyQuy, XA), ['CS08', 'CS10', 'CS11', 'CS12']);
});

test('BR03/BR04: bộ mới với chỉ số chỉ cho Sở, tần suất Quý -> kỳ Quý: Sở có, Xã không; kỳ Năm: không ai có', async () => {
  const { MaBo, MaNhom } = await taoBoNhap('Bộ BR03', { loai: [XA] }); // CS thử: NAM, chỉ Xã
  const { data: { MaChiSo } } = await goi('POST', `/nhom/${MaNhom}/chiso`, chiSoTyLe({ KyHieu: 'Q1', LoaiDonVi: [SO], TanSuat: 'QUY' }));
  assert.equal((await goi('POST', `/bochiso/${MaBo}/banhanh`)).status, 200);
  const maQ = await kySv.taoKy(db, { TenKy: 'Q BR03', LoaiKy: 'QUY', NgayBatDau: '2033-01-01', NgayKetThuc: '2033-03-31', HanNop: '2033-04-10', NgayChot: '2033-04-30', MaBo });
  const maN = await kySv.taoKy(db, { TenKy: 'N BR03', LoaiKy: 'NAM', NgayBatDau: '2033-01-01', NgayKetThuc: '2033-12-31', HanNop: '2033-12-31', NgayChot: '2034-01-31', MaBo });
  const ma = async (maKy, loai) => (await kySv.chiSoApDung(db, await kySv.layKy(db, maKy), loai)).map((c) => c.MaChiSo);
  assert.deepEqual(await ma(maQ, SO), [MaChiSo]);
  assert.deepEqual(await ma(maQ, XA), []);
  assert.deepEqual(await ma(maN, SO), []);
  assert.equal((await ma(maN, XA)).length, 1);
});

// ============ Mức độ chuyển đổi số ============
test('MD: ghi lại danh sách mức độ; tên trống, từ > đến, âm, > 100, không phải số bị 422 và không xóa dữ liệu cũ', async () => {
  const { MaBo } = await taoBoNhap('Bộ mức độ');
  const ok = await goi('PUT', `/bochiso/${MaBo}/mucdo`, { MucDo: [{ TenMucDo: 'Thấp', DiemTu: 0, DiemDen: 50 }, { TenMucDo: 'Cao', DiemTu: '50', DiemDen: '100' }] });
  assert.equal(ok.status, 200);
  assert.equal((await db('MUCDOCHUYENDOISO').where({ MaBo })).length, 2);
  for (const m of [
    { TenMucDo: ' ', DiemTu: 0, DiemDen: 100 },
    { TenMucDo: 'A', DiemTu: 60, DiemDen: 50 },
    { TenMucDo: 'A', DiemTu: -1, DiemDen: 50 },
    { TenMucDo: 'A', DiemTu: 0, DiemDen: 100.01 },
    { TenMucDo: 'A', DiemTu: 'x', DiemDen: 100 },
    { TenMucDo: 'A', DiemTu: 0, DiemDen: '' },
  ]) coLoi(await goi('PUT', `/bochiso/${MaBo}/mucdo`, { MucDo: [m] }), 422, /RB06/);
  assert.equal((await db('MUCDOCHUYENDOISO').where({ MaBo })).length, 2);
  coLoi(await goi('PUT', '/bochiso/999999/mucdo', { MucDo: [] }), 404);
});

test('MD: ngưỡng chồng lấn, hở, không bắt đầu từ 0 hoặc không tới 100 bị chặn khi ban hành (RB09)', async () => {
  const ca = [
    [[['A', 0, 60], ['B', 50, 100]], /nối liền/], // chồng lấn
    [[['A', 0, 50], ['B', 60, 100]], /nối liền/], // hở
    [[['A', 10, 50], ['B', 50, 100]], /phủ từ 0 đến 100/],
    [[['A', 0, 50], ['B', 50, 99.99]], /phủ từ 0 đến 100/],
    [[['B', 50, 100], ['A', 0, 50], ['C', 20, 30]], /nối liền/], // nhập lộn thứ tự + chồng
  ];
  for (const [md, mau] of ca) {
    const { MaBo } = await taoBoNhap('Bộ RB09');
    await goi('PUT', `/bochiso/${MaBo}/mucdo`, { MucDo: md.map(([TenMucDo, DiemTu, DiemDen]) => ({ TenMucDo, DiemTu, DiemDen })) });
    const r = await goi('POST', `/bochiso/${MaBo}/banhanh`);
    coLoi(r, 422);
    assert.ok(r.data.chiTiet.some((x) => mau.test(x)), `${JSON.stringify(md)} -> ${JSON.stringify(r.data.chiTiet)}`);
  }
  // nhập lộn thứ tự nhưng nối liền thì đạt
  const { MaBo } = await taoBoNhap('Bộ RB09 đạt');
  await goi('PUT', `/bochiso/${MaBo}/mucdo`, { MucDo: [{ TenMucDo: 'Cao', DiemTu: 50, DiemDen: 100 }, { TenMucDo: 'Thấp', DiemTu: 0, DiemDen: 50 }] });
  assert.equal((await goi('POST', `/bochiso/${MaBo}/banhanh`)).status, 200);
});

test('MD: xếp mức độ tại biên: điểm biên thuộc mức trên, 100 thuộc mức cuối, 0 thuộc mức đầu', async () => {
  const md = (await bochiso.layBo(db, s.maBo)).MucDo; // Yếu 0-50, TB 50-65, Khá 65-80, Tốt 80-90, Xuất sắc 90-100
  const ten = (d) => xacDinhMucDo(md, d)?.TenMucDo ?? null;
  assert.equal(ten(0), 'Yếu');
  assert.equal(ten(49.99), 'Yếu');
  assert.equal(ten(50), 'Trung bình');
  assert.equal(ten(89.99), 'Tốt');
  assert.equal(ten(90), 'Xuất sắc');
  assert.equal(ten(100), 'Xuất sắc');
  assert.equal(ten(100.01), null);
  assert.equal(ten(-0.01), null);
});

test('MD: mức độ có độ rộng 0 (điểm từ = điểm đến) phải bị chặn', { todo: 'BUG-06: chấp nhận mức [50;50] và ban hành được; mức đó không bao giờ được xếp (xacDinhMucDo dùng < DiemDen)' }, async () => {
  const { MaBo } = await taoBoNhap('Bộ mức rỗng');
  const r1 = await goi('PUT', `/bochiso/${MaBo}/mucdo`, { MucDo: [{ TenMucDo: 'Thấp', DiemTu: 0, DiemDen: 50 }, { TenMucDo: 'Ma', DiemTu: 50, DiemDen: 50 }, { TenMucDo: 'Cao', DiemTu: 50, DiemDen: 100 }] });
  const r2 = await goi('POST', `/bochiso/${MaBo}/banhanh`);
  assert.ok(r1.status === 422 || r2.status === 422, `PUT ${r1.status}, ban hành ${r2.status}`);
});
