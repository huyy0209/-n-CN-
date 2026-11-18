// Danh mục nghiệp vụ do Cán bộ cơ quan chủ trì quản lý: đơn vị (UC 1.4), loại minh chứng (UC 1.6), bộ chỉ số (UC 1.5).
const express = require('express');
const { db, them } = require('../db');
const { Loi } = require('../services/common');
const { bat, dangNhap, vaiTro } = require('../middleware/auth');
const bochiso = require('../services/bochiso');
const C = require('../lib/consts');

const r = express.Router();
r.use(dangNhap);
const chuTri = vaiTro('CHU_TRI');
const so = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

// --- Loại đơn vị, đơn vị ---
r.get('/loaidonvi', bat(async (req, res) => res.json(await db('LOAIDONVI').orderBy('MaLoaiDV'))));

r.get('/donvi', bat(async (req, res) => {
  res.json(await db('DONVI as d').join('LOAIDONVI as l', 'l.MaLoaiDV', 'd.MaLoaiDV').select('d.*', 'l.TenLoaiDV').orderBy(['d.MaLoaiDV', 'd.TenDV']));
}));

async function dongDonVi(b) {
  if (!b.TenDV || !String(b.TenDV).trim()) throw new Loi(422, 'Thiếu tên đơn vị.');
  if (!(await db('LOAIDONVI').where({ MaLoaiDV: b.MaLoaiDV }).first())) throw new Loi(422, 'Loại đơn vị không hợp lệ.');
  return { TenDV: String(b.TenDV).trim(), Email: b.Email || null, MaLoaiDV: b.MaLoaiDV };
}

r.post('/donvi', chuTri, bat(async (req, res) => res.status(201).json({ MaDV: await them(db, 'DONVI', await dongDonVi(req.body || {}), 'MaDV') })));

r.put('/donvi/:id', chuTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  const dong = await dongDonVi(req.body || {});
  const cu = await db('DONVI').where({ MaDV: id }).first();
  if (!cu) throw new Loi(404, 'Không tìm thấy đơn vị.');
  // Đổi loại đơn vị làm đổi tập chỉ số áp dụng nên chặn khi đơn vị đã được giao vào kỳ
  if (cu.MaLoaiDV !== dong.MaLoaiDV && (await db('HOSODANHGIA').where({ MaDV: id }).first())) throw new Loi(409, 'Đơn vị đã được giao vào kỳ, không đổi được loại đơn vị.');
  await db('DONVI').where({ MaDV: id }).update(dong);
  res.json({ ok: true });
}));

// Danh mục đã dùng thì không xóa (BR24)
r.delete('/donvi/:id', chuTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  if (await db('HOSODANHGIA').where({ MaDV: id }).first()) throw new Loi(409, 'Đơn vị đã được giao vào kỳ, không xóa được. (BR24)');
  if (await db('NGUOIDUNG').where({ MaDV: id }).first()) throw new Loi(409, 'Đơn vị đang có tài khoản, không xóa được.');
  await db('DONVI').where({ MaDV: id }).del();
  res.json({ ok: true });
}));

// --- Loại minh chứng ---
r.get('/loaiminhchung', bat(async (req, res) => res.json(await db('LOAIMINHCHUNG').orderBy('MaLoaiMC'))));

r.post('/loaiminhchung', chuTri, bat(async (req, res) => {
  const ten = String((req.body || {}).TenLoaiMC || '').trim();
  if (!ten) throw new Loi(422, 'Thiếu tên loại minh chứng.');
  res.status(201).json({ MaLoaiMC: await them(db, 'LOAIMINHCHUNG', { TenLoaiMC: ten }, 'MaLoaiMC') });
}));

r.put('/loaiminhchung/:id', chuTri, bat(async (req, res) => {
  const ten = String((req.body || {}).TenLoaiMC || '').trim();
  if (!ten) throw new Loi(422, 'Thiếu tên loại minh chứng.');
  await db('LOAIMINHCHUNG').where({ MaLoaiMC: Number(req.params.id) }).update({ TenLoaiMC: ten });
  res.json({ ok: true });
}));

r.delete('/loaiminhchung/:id', chuTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  if (await db('MINHCHUNG').where({ MaLoaiMC: id }).first()) throw new Loi(409, 'Loại minh chứng đã được dùng, không xóa được. (BR24)');
  await db('LOAIMINHCHUNG').where({ MaLoaiMC: id }).del();
  res.json({ ok: true });
}));

// --- Bộ chỉ số (BR14) ---
r.get('/bochiso', bat(async (req, res) => res.json(await db('BOCHISO').orderBy('MaBo', 'desc'))));
r.get('/bochiso/:id', bat(async (req, res) => res.json(await bochiso.layBo(db, Number(req.params.id)))));

r.post('/bochiso', chuTri, bat(async (req, res) => {
  const b = req.body || {};
  if (!b.TenBo || !String(b.TenBo).trim()) throw new Loi(422, 'Thiếu tên bộ chỉ số.');
  res.status(201).json({ MaBo: await them(db, 'BOCHISO', { TenBo: String(b.TenBo).trim(), CanCuPhapLy: b.CanCuPhapLy || null, TrangThaiBo: 'NHAP' }, 'MaBo') });
}));

r.put('/bochiso/:id', chuTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  await bochiso.yeuCauNhap(db, id);
  if (!b.TenBo || !String(b.TenBo).trim()) throw new Loi(422, 'Thiếu tên bộ chỉ số.');
  await db('BOCHISO').where({ MaBo: id }).update({ TenBo: String(b.TenBo).trim(), CanCuPhapLy: b.CanCuPhapLy || null });
  res.json({ ok: true });
}));

r.post('/bochiso/:id/saochep', chuTri, bat(async (req, res) => res.status(201).json({ MaBo: await bochiso.saoChep(db, Number(req.params.id), (req.body || {}).TenBo) })));
r.post('/bochiso/:id/banhanh', chuTri, bat(async (req, res) => { await bochiso.banHanh(db, Number(req.params.id), req.nguoi); res.json({ ok: true }); }));

// Ngừng hiệu lực: chỉ khi không còn kỳ Nháp hoặc Đang mở dùng bộ này
r.post('/bochiso/:id/ngunghieuluc', chuTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  const bo = await db('BOCHISO').where({ MaBo: id }).first();
  if (!bo || bo.TrangThaiBo !== 'BAN_HANH') throw new Loi(409, 'Chỉ ngừng hiệu lực được bộ đang Ban hành.');
  if (await db('KYDANHGIA').where({ MaBo: id }).whereIn('TrangThaiKy', ['NHAP', 'DANG_MO']).first()) throw new Loi(409, 'Còn kỳ Nháp hoặc Đang mở dùng bộ này.');
  await db('BOCHISO').where({ MaBo: id }).update({ TrangThaiBo: 'HET_HIEU_LUC' });
  res.json({ ok: true });
}));

// Xóa bộ Nháp (bộ đã ban hành thì không xóa)
r.delete('/bochiso/:id', chuTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  await db.transaction(async (trx) => {
    await bochiso.yeuCauNhap(trx, id);
    const bo = await bochiso.layBo(trx, id);
    for (const n of bo.Nhom) for (const c of n.ChiSo) await bochiso.xoaChiSo(trx, c.MaChiSo);
    await trx('NHOMCHISO').where({ MaBo: id }).del();
    await trx('MUCDOCHUYENDOISO').where({ MaBo: id }).del();
    await trx('BOCHISO').where({ MaBo: id }).del();
  });
  res.json({ ok: true });
}));

// Nhóm chỉ số
function dongNhom(b) {
  const ts = so(b.TrongSo);
  if (!b.TenNhom || !String(b.TenNhom).trim()) throw new Loi(422, 'Thiếu tên nhóm.');
  if (!(ts > 0 && ts <= 100)) throw new Loi(422, 'Trọng số phải lớn hơn 0 và không quá 100.');
  return { TenNhom: String(b.TenNhom).trim(), TrongSo: ts };
}
const boCuaNhom = async (trx, maNhom) => {
  const n = await trx('NHOMCHISO').where({ MaNhom: maNhom }).first();
  if (!n) throw new Loi(404, 'Không tìm thấy nhóm chỉ số.');
  return bochiso.yeuCauNhap(trx, n.MaBo);
};
const boCuaChiSo = async (trx, maChiSo) => {
  const c = await trx('CHISO').where({ MaChiSo: maChiSo }).first();
  if (!c) throw new Loi(404, 'Không tìm thấy chỉ số.');
  return boCuaNhom(trx, c.MaNhom);
};

r.post('/bochiso/:id/nhom', chuTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  await bochiso.yeuCauNhap(db, id);
  res.status(201).json({ MaNhom: await them(db, 'NHOMCHISO', { ...dongNhom(req.body || {}), MaBo: id }, 'MaNhom') });
}));
r.put('/nhom/:id', chuTri, bat(async (req, res) => {
  await boCuaNhom(db, Number(req.params.id));
  await db('NHOMCHISO').where({ MaNhom: Number(req.params.id) }).update(dongNhom(req.body || {}));
  res.json({ ok: true });
}));
r.delete('/nhom/:id', chuTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  await boCuaNhom(db, id);
  if (await db('CHISO').where({ MaNhom: id }).first()) throw new Loi(409, 'Nhóm còn chỉ số, hãy xóa chỉ số trước.');
  await db('NHOMCHISO').where({ MaNhom: id }).del();
  res.json({ ok: true });
}));

// Chỉ số (kèm bậc điểm và loại đơn vị áp dụng)
function kiemTraChiSo(b) {
  if (!b.TenChiSo || !String(b.TenChiSo).trim()) throw new Loi(422, 'Thiếu tên chỉ số.');
  if (!C.KIEU_CONG_THUC.includes(b.KieuCongThuc)) throw new Loi(422, 'Kiểu công thức không hợp lệ. (RB01)');
  if (!C.TAN_SUAT.includes(b.TanSuat)) throw new Loi(422, 'Tần suất phải là Quý hoặc Năm. (RB01)');
  if (b.ChieuTot && !C.CHIEU_TOT.includes(b.ChieuTot)) throw new Loi(422, 'Chiều tốt không hợp lệ. (RB01)');
  const c = { ...b, TenChiSo: String(b.TenChiSo).trim(), DiemToiDa: so(b.DiemToiDa), ChiTieu: so(b.ChiTieu), GiaTriMin: so(b.GiaTriMin) ?? 0, GiaTriMax: so(b.GiaTriMax) };
  if (!(c.DiemToiDa > 0)) throw new Loi(422, 'Điểm tối đa phải lớn hơn 0. (RB05)');
  if (c.KieuCongThuc !== 'CO_KHONG') {
    if (c.GiaTriMax === null || !(c.GiaTriMin <= c.GiaTriMax)) throw new Loi(422, 'Miền giá trị không hợp lệ (cần giá trị nhỏ nhất ≤ giá trị lớn nhất).');
  }
  if (c.KieuCongThuc === 'TY_LE' && !(c.ChiTieu > 0 && c.ChiTieu >= c.GiaTriMin && c.ChiTieu <= c.GiaTriMax)) throw new Loi(422, 'Chỉ tiêu phải lớn hơn 0 và nằm trong miền giá trị. (RB05)');
  c.BacDiem = (Array.isArray(b.BacDiem) ? b.BacDiem : []).map((x) => ({ TuGiaTri: so(x.TuGiaTri), DenGiaTri: so(x.DenGiaTri), Diem: so(x.Diem) }));
  for (const x of c.BacDiem) {
    if (x.TuGiaTri === null || x.Diem === null || (x.DenGiaTri !== null && x.TuGiaTri > x.DenGiaTri)) throw new Loi(422, 'Bậc điểm không hợp lệ (cần từ giá trị ≤ đến giá trị, có điểm). (RB06)');
  }
  c.LoaiDonVi = (Array.isArray(b.LoaiDonVi) ? b.LoaiDonVi : []).map(Number);
  return c;
}

r.post('/nhom/:id/chiso', chuTri, bat(async (req, res) => {
  const maNhom = Number(req.params.id);
  const c = kiemTraChiSo(req.body || {});
  const MaChiSo = await db.transaction(async (trx) => { await boCuaNhom(trx, maNhom); return bochiso.themChiSo(trx, maNhom, c); });
  res.status(201).json({ MaChiSo });
}));
r.put('/chiso/:id', chuTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  const c = kiemTraChiSo(req.body || {});
  await db.transaction(async (trx) => { await boCuaChiSo(trx, id); await bochiso.suaChiSo(trx, id, c); });
  res.json({ ok: true });
}));
r.delete('/chiso/:id', chuTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  await db.transaction(async (trx) => { await boCuaChiSo(trx, id); await bochiso.xoaChiSo(trx, id); });
  res.json({ ok: true });
}));

// Ngưỡng mức độ: ghi lại cả danh sách
r.put('/bochiso/:id/mucdo', chuTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  const ds = (Array.isArray((req.body || {}).MucDo) ? req.body.MucDo : []).map((m) => ({ TenMucDo: String(m.TenMucDo || '').trim(), DiemTu: so(m.DiemTu), DiemDen: so(m.DiemDen) }));
  for (const m of ds) {
    if (!m.TenMucDo || m.DiemTu === null || m.DiemDen === null || !(m.DiemTu >= 0 && m.DiemTu <= m.DiemDen && m.DiemDen <= 100)) throw new Loi(422, 'Ngưỡng mức độ không hợp lệ: cần tên và 0 ≤ điểm từ ≤ điểm đến ≤ 100. (RB06)');
  }
  await db.transaction(async (trx) => {
    await bochiso.yeuCauNhap(trx, id);
    await trx('MUCDOCHUYENDOISO').where({ MaBo: id }).del();
    for (const m of ds) await trx('MUCDOCHUYENDOISO').insert({ ...m, MaBo: id });
  });
  res.json({ ok: true });
}));

module.exports = r;
