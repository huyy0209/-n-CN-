// Ca biên kỳ, báo cáo, minh chứng và thẩm định trên SQLite tạm.
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs');
const express = require('express');

const tepDb = path.join(os.tmpdir(), `is028-ky-baocao-${process.pid}.sqlite`);
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_FILE = tepDb;
const { db } = require('../src/db');
const { taoBang } = require('../src/schema');
const { seed } = require('../src/seed');
const ky = require('../src/services/ky');
const bc = require('../src/services/baocao');
const nghiepVu = require('../src/routes/nghiepvu');
const { taoToken } = require('../src/middleware/auth');

let s;
const vn = (x) => new Date(`${x}+07:00`);
const reject = (fn, re) => assert.rejects(fn, (e) => { assert.match(e.message, re); return true; });
const dataKy = (name, start='2028-01-01') => ({
  TenKy: name, LoaiKy: 'NAM', NgayBatDau: start, NgayKetThuc: `${start.slice(0,4)}-12-31`,
  HanNop: `${start.slice(0,4)}-12-31`, NgayChot: `${Number(start.slice(0,4))+1}-01-31`, MaBo: s.maBo,
});
async function startApi() {
  const app = express();
  app.use(express.json());
  app.use('/api', nghiepVu);
  app.use((e, req, res, next) => res.status(e.status || e.statusCode || 500).json({ message: e.message }));
  const server = await new Promise(resolve => { const x = app.listen(0, '127.0.0.1', () => resolve(x)); });
  return { server, base: `http://127.0.0.1:${server.address().port}/api` };
}
async function closeApi(server) { await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
async function freshOpenKy(name, unit, start='2040-01-01') {
  const maKy = await ky.taoKy(db, dataKy(name, start));
  await ky.giaoDonVi(db, maKy, [unit], s.nd.chutri);
  await ky.moKy(db, maKy, s.nd.chutri, vn(`${start.slice(0,4)}-01-01T09:00:00`));
  return { maKy, giao: await db('GIAODONVI').where({ MaKy:maKy, MaDV:unit }).first() };
}
async function jsonReq(url, token, method='GET', body) {
  const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { res, data: await res.json() };
}

test.before(async () => { await taoBang(db); s = await seed(db); });
test.after(async () => { await db.destroy(); fs.rmSync(tepDb, { force: true }); });

test('giao lặp không tạo dòng trùng; bỏ giao chỉ hợp lệ ở Nháp và sau đó kỳ có thể mở (UC 2.1/2.2, BR17, BR24)', async () => {
  const maKy = await ky.taoKy(db, dataKy('Kỳ kiểm tra giao'));
  assert.equal(await ky.giaoDonVi(db, maKy, [s.dv.pa, s.dv.pa], s.nd.chutri), 1);
  assert.equal(await ky.giaoDonVi(db, maKy, [s.dv.pa], s.nd.chutri), 0);
  const g = await db('GIAODONVI').where({ MaKy: maKy }).first();
  await ky.boGiao(db, g.MaGiao);
  assert.equal(await db('GIAODONVI').where({ MaKy: maKy }).count({ n: '*' }).first().then(x => Number(x.n)), 0);
  await ky.giaoDonVi(db, maKy, [s.dv.pa], s.nd.chutri);
  await ky.moKy(db, maKy, s.nd.chutri, vn('2028-01-01T09:00:00'));
  const gMo = await db('GIAODONVI').where({ MaKy: maKy }).first();
  await reject(() => ky.boGiao(db, gMo.MaGiao), /Chỉ bỏ được lượt giao/);
});

test('giao chứa đơn vị không tồn tại rollback toàn bộ lượt hợp lệ đi trước (UC 2.2)', async () => {
  const maKy = await ky.taoKy(db, dataKy('Kỳ giao lỗi', '2029-01-01'));
  await reject(() => ky.giaoDonVi(db, maKy, [s.dv.pa, 999999], s.nd.chutri), /không tồn tại/);
  assert.equal(await db('GIAODONVI').where({ MaKy: maKy }).count({ n: '*' }).first().then(x => Number(x.n)), 0);
});

test('ngoài miền vẫn lưu nháp rồi bị chặn gửi; sửa báo cáo sau gửi bị từ chối (BR21, BR06, RB19)', async () => {
  const g = await db('GIAODONVI').where({ MaKy: s.kyQ4, MaDV: s.dv.pa }).first();
  const { MaBC, CanhBao } = await bc.luuNhap(db, g.MaGiao, s.CS.CS11, 101, s.nd.dm_pa);
  assert.match(CanhBao, /ngoài miền/);
  await reject(() => bc.guiBaoCao(db, MaBC, s.nd.dm_pa), /chưa đủ điều kiện gửi/);
  await bc.luuNhap(db, g.MaGiao, s.CS.CS11, 80, s.nd.dm_pa);
  const loai = await db('LOAIMINHCHUNG').first();
  await bc.themMinhChung(db, MaBC, { TenTep: 'hop-le.pdf', DuongDan: 'hop-le.pdf', DungLuong: 1 }, loai.MaLoaiMC, s.nd.dm_pa);
  await bc.guiBaoCao(db, MaBC, s.nd.dm_pa, vn('2026-11-20T10:00:00'));
  await reject(() => bc.luuNhap(db, g.MaGiao, s.CS.CS11, 81, s.nd.dm_pa), /không sửa được/);
});

test('Chưa đạt cần nhận xét khác khoảng trắng; trả về bổ sung, đầu mối gửi lại rồi lưu đủ hai vòng lịch sử (RB07, BR09)', async () => {
  const g = await db('GIAODONVI').where({ MaKy: s.kyQ4, MaDV: s.dv.syt }).first();
  const { MaBC } = await bc.luuNhap(db, g.MaGiao, s.CS.CS12, 80, s.nd.dm_syt);
  const loai = await db('LOAIMINHCHUNG').first();
  await bc.themMinhChung(db, MaBC, { TenTep: 'a.pdf', DuongDan: 'a.pdf', DungLuong: 4 }, loai.MaLoaiMC, s.nd.dm_syt);
  await bc.guiBaoCao(db, MaBC, s.nd.dm_syt, vn('2026-11-21T10:00:00'));
  await reject(() => bc.ketLuan(db, MaBC, 'CHUA_DAT', '  \n ', s.nd.td_skhcn), /bắt buộc có nhận xét/);
  await bc.ketLuan(db, MaBC, 'CHUA_DAT', 'Cần bổ sung tài liệu.', s.nd.td_skhcn);
  await bc.luuNhap(db, g.MaGiao, s.CS.CS12, 81, s.nd.dm_syt);
  await bc.guiBaoCao(db, MaBC, s.nd.dm_syt, vn('2026-11-22T10:00:00'));
  await bc.ketLuan(db, MaBC, 'DAT', '', s.nd.td_skhcn);
  const detail = await bc.chiTietBaoCao(db, MaBC);
  assert.deepEqual(detail.ThamDinh.map(x => [x.VongThamDinh, x.KetLuan]), [[1, 'CHUA_DAT'], [2, 'DAT']]);
  assert.equal(detail.NgayGui.getTime(), vn('2026-11-21T10:00:00').getTime());
});

test('BR07 phân biệt sát ranh cuối ngày với nộp trễ theo lần gửi đầu; giao bổ sung sau mở không trùng', async () => {
  const g = await db('GIAODONVI').where({ MaKy: s.kyQ4, MaDV: s.dv.dkc }).first();
  const { MaBC } = await bc.luuNhap(db, g.MaGiao, s.CS.CS12, 60, s.nd.dm_dkc);
  const loai = await db('LOAIMINHCHUNG').first();
  await bc.themMinhChung(db, MaBC, { TenTep: 'b.pdf', DuongDan: 'b.pdf', DungLuong: 2 }, loai.MaLoaiMC, s.nd.dm_dkc);
  await bc.guiBaoCao(db, MaBC, s.nd.dm_dkc, vn('2027-01-10T23:59:59'));
  const td = (await ky.tienDo(db, s.kyQ4, vn('2027-01-11T00:00:01'))).find(x => x.MaGiao === g.MaGiao);
  assert.equal(td.GuiTre, 0);
  assert.equal(await ky.giaoDonVi(db, s.kyQ4, [s.dv.xb], s.nd.chutri, vn('2026-11-23T09:00:00')), 0);
});

test('HTTP: tạo/sửa/xóa kỳ Nháp, RB04 cho mọi cặp mốc và chặn sửa/xóa sau mở', async () => {
  // Mọi cặp trong chuỗi ngày phải đúng thứ tự; đảo từng cặp đều bị RB04 từ chối.
  const base = { NgayBatDau:'2030-01-01', NgayKetThuc:'2030-03-01', HanNop:'2030-06-01', NgayChot:'2030-12-01' };
  const keys = Object.keys(base);
  for (let i=0; i<keys.length; i++) for (let j=i+1; j<keys.length; j++) {
    const d = { ...base, [keys[i]]: base[keys[j]], [keys[j]]: base[keys[i]] };
    await reject(() => ky.taoKy(db, { ...dataKy(`RB04 ${i}-${j}`, '2030-01-01'), ...d }), /RB04/);
  }
  const { server, base: url } = await startApi();
  try {
    const token = taoToken(s.nd.chutri);
    const d = dataKy('Kỳ HTTP sửa được', '2031-01-01');
    let out = await jsonReq(`${url}/ky`, token, 'POST', d);
    assert.equal(out.res.status, 201);
    const id = out.data.MaKy;
    out = await jsonReq(`${url}/ky/${id}`, token, 'PUT', { ...d, TenKy:'Kỳ HTTP đã sửa' });
    assert.equal(out.res.status, 200);
    out = await jsonReq(`${url}/ky/${id}`, token, 'DELETE');
    assert.equal(out.res.status, 200);

    out = await jsonReq(`${url}/ky`, token, 'POST', dataKy('Kỳ HTTP mở', '2032-01-01'));
    const activeId = out.data.MaKy;
    await ky.giaoDonVi(db, activeId, [s.dv.pa], s.nd.chutri);
    await ky.moKy(db, activeId, s.nd.chutri);
    out = await jsonReq(`${url}/ky/${activeId}`, token, 'PUT', { ...dataKy('Kỳ HTTP mở', '2032-01-01'), TenKy:'Không sửa sau mở' });
    assert.equal(out.res.status, 409);
    out = await jsonReq(`${url}/ky/${activeId}`, token, 'DELETE');
    assert.equal(out.res.status, 409);
  } finally { await closeApi(server); }
});

test('gia hạn: trước hạn hiện hành, bằng ngày chốt, vượt chốt, nối tiếp nhiều lần và sau lần gửi đầu (BR16, BR22, RB18)', async () => {
  const { giao: deadline } = await freshOpenKy('Kỳ gia hạn chốt', s.dv.dkc);
  const now = vn('2040-12-01T09:00:00');
  await reject(() => ky.giaHan(db, deadline.MaGiao, '2040-12-31', s.nd.chutri, now), /phải sau hạn hiện hành/);
  await reject(() => ky.giaHan(db, deadline.MaGiao, '2041-02-01', s.nd.chutri, now), /không được vượt ngày chốt/);
  await ky.giaHan(db, deadline.MaGiao, '2041-01-31', s.nd.chutri, now); // đúng ngày chốt được chấp nhận
  const { giao: second } = await freshOpenKy('Kỳ gia hạn nhiều lần', s.dv.syt, '2042-01-01');
  await ky.giaHan(db, second.MaGiao, '2043-01-15', s.nd.chutri, vn('2042-12-01T09:00:00'));
  await ky.giaHan(db, second.MaGiao, '2043-01-20', s.nd.chutri, vn('2043-01-15T23:59:00'));
  const { MaBC } = await bc.luuNhap(db, second.MaGiao, s.CS.CS01, 1, s.nd.dm_syt);
  const loai = await db('LOAIMINHCHUNG').first();
  await bc.themMinhChung(db, MaBC, { TenTep:'extension.pdf', DuongDan:'extension.pdf', DungLuong:1 }, loai.MaLoaiMC, s.nd.dm_syt);
  await bc.guiBaoCao(db, MaBC, s.nd.dm_syt, vn('2043-01-16T09:00:00'));
  await ky.giaHan(db, second.MaGiao, '2043-01-25', s.nd.chutri, vn('2043-01-20T09:00:00'));
  assert.equal((await db('GIAODONVI').where({ MaGiao:second.MaGiao }).first()).HanGiaHan, '2043-01-25');
});

test('BR19 chặn sửa lượt giao khác đơn vị; RB11 chặn chỉ số không áp dụng (BR19, RB11)', async () => {
  const own = await db('GIAODONVI').where({ MaKy:s.kyQ4, MaDV:s.dv.pa }).first();
  await reject(() => bc.luuNhap(db, own.MaGiao, s.CS.CS12, 50, s.nd.dm_xb), /đơn vị mình/);
  await reject(() => bc.luuNhap(db, own.MaGiao, s.CS.CS13, 50, s.nd.dm_pa), /không áp dụng/); // CS13 chỉ cho xã
});

test('minh chứng bắt buộc khi gửi; thay thế giữ lịch sử và không thay được sau khi đã gửi (BR05, RB16)', async () => {
  const { giao:g } = await freshOpenKy('Kỳ minh chứng', s.dv.dkc, '2044-01-01');
  const { MaBC } = await bc.luuNhap(db, g.MaGiao, s.CS.CS01, 1, s.nd.dm_dkc);
  await reject(() => bc.guiBaoCao(db, MaBC, s.nd.dm_dkc), /chưa đủ điều kiện gửi/);
  const loai = await db('LOAIMINHCHUNG').first();
  const first = await bc.themMinhChung(db, MaBC, { TenTep:'old.pdf', DuongDan:'old.pdf', DungLuong:1 }, loai.MaLoaiMC, s.nd.dm_dkc);
  await bc.thayTheMinhChung(db, first, s.nd.dm_dkc);
  await reject(() => bc.guiBaoCao(db, MaBC, s.nd.dm_dkc), /chưa đủ điều kiện gửi/);
  await bc.themMinhChung(db, MaBC, { TenTep:'new.pdf', DuongDan:'new.pdf', DungLuong:2 }, loai.MaLoaiMC, s.nd.dm_dkc);
  await bc.guiBaoCao(db, MaBC, s.nd.dm_dkc, vn('2044-11-25T10:00:00'));
  await reject(() => bc.thayTheMinhChung(db, first, s.nd.dm_dkc), /không sửa được/);
  const detail = await bc.chiTietBaoCao(db, MaBC);
  assert.deepEqual(detail.MinhChung.map(x => x.TrangThaiMC), ['DA_THAY_THE', 'HIEU_LUC']);
});

test('HTTP multipart: từ chối phần mở rộng sai và vượt giới hạn 10 MB', async () => {
  const { giao:g } = await freshOpenKy('Kỳ tải minh chứng', s.dv.xb, '2045-01-01');
  const { MaBC } = await bc.luuNhap(db, g.MaGiao, s.CS.CS01, 1, s.nd.dm_xb);
  const { server, base: url } = await startApi();
  try {
    const token = taoToken(s.nd.dm_xb);
    const send = async (name, size) => {
      const form = new FormData();
      form.set('MaLoaiMC', String((await db('LOAIMINHCHUNG').first()).MaLoaiMC));
      form.set('tep', new Blob([new Uint8Array(size)], { type:'application/octet-stream' }), name);
      return fetch(`${url}/baocao/${MaBC}/minhchung`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:form });
    };
    let res = await send('bad.exe', 10);
    assert.equal(res.status, 422);
    assert.match((await res.json()).message, /không đúng định dạng/);
    res = await send('too-large.pdf', 10 * 1024 * 1024 + 1);
    assert.equal(res.status, 422);
    assert.match((await res.json()).message, /vượt quá 10 MB/);
  } finally { await closeApi(server); }
});
