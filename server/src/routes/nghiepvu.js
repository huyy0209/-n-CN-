// Nghiệp vụ chính: kỳ đánh giá (nhóm UC 2), báo cáo số liệu (nhóm 3), thẩm định (nhóm 4), tiến độ và kết quả (nhóm 5).
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { db } = require('../db');
const { Loi } = require('../services/common');
const { bat, dangNhap, vaiTro } = require('../middleware/auth');
const kySv = require('../services/ky');
const bcSv = require('../services/baocao');
const tongHop = require('../services/tonghop');
const { ymd } = require('../lib/dates');
const C = require('../lib/consts');

const r = express.Router();
r.use(dangNhap);
const chuTri = vaiTro('CHU_TRI');
const xemTongHop = vaiTro('CHU_TRI', 'LANH_DAO');

const THU_MUC_TEP = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(THU_MUC_TEP, { recursive: true });
const MAX_MB = Number(process.env.MAX_FILE_MB || 10);

// Chuẩn hóa các cột ngày của kỳ về chuỗi YYYY-MM-DD
const dinhDangKy = (k) => ({ ...k, NgayBatDau: ymd(k.NgayBatDau), NgayKetThuc: ymd(k.NgayKetThuc), HanNop: ymd(k.HanNop), NgayChot: ymd(k.NgayChot) });

// ===== Kỳ đánh giá =====
r.get('/ky', bat(async (req, res) => {
  const q = db('KYDANHGIA as k').join('BOCHISO as b', 'b.MaBo', 'k.MaBo').select('k.*', 'b.TenBo').orderBy('k.NgayBatDau', 'desc');
  if (req.nguoi.MaVaiTro !== 'CHU_TRI') q.whereNot({ 'k.TrangThaiKy': 'NHAP' }); // kỳ Nháp chỉ cán bộ chủ trì thấy
  res.json((await q).map(dinhDangKy));
}));

r.get('/ky/:id', xemTongHop, bat(async (req, res) => {
  const id = Number(req.params.id);
  const ky = await kySv.layKy(db, id);
  const bo = await db('BOCHISO').where({ MaBo: ky.MaBo }).first();
  res.json({ ...dinhDangKy(ky), TenBo: bo.TenBo, TienDo: await kySv.tienDo(db, id) });
}));

r.post('/ky', chuTri, bat(async (req, res) => res.status(201).json({ MaKy: await kySv.taoKy(db, req.body || {}) })));

// Sửa thông tin kỳ khi còn Nháp
r.put('/ky/:id', chuTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  const d = req.body || {};
  const ky = await kySv.layKy(db, id);
  if (ky.TrangThaiKy !== 'NHAP') throw new Loi(409, 'Chỉ sửa được kỳ đang ở trạng thái Nháp.');
  if (!d.TenKy) throw new Loi(422, 'Thiếu tên kỳ.');
  kySv.kiemTraMocNgay(d);
  await db('KYDANHGIA').where({ MaKy: id }).update({ TenKy: d.TenKy, NgayBatDau: d.NgayBatDau, NgayKetThuc: d.NgayKetThuc, HanNop: d.HanNop, NgayChot: d.NgayChot });
  res.json({ ok: true });
}));

r.delete('/ky/:id', chuTri, bat(async (req, res) => {
  const id = Number(req.params.id);
  const ky = await kySv.layKy(db, id);
  if (ky.TrangThaiKy !== 'NHAP') throw new Loi(409, 'Chỉ xóa được kỳ đang ở trạng thái Nháp.');
  await db.transaction(async (trx) => { await trx('HOSODANHGIA').where({ MaKy: id }).del(); await trx('KYDANHGIA').where({ MaKy: id }).del(); });
  res.json({ ok: true });
}));

r.post('/ky/:id/giao', chuTri, bat(async (req, res) => {
  const ds = (Array.isArray((req.body || {}).MaDV) ? req.body.MaDV : []).map(Number);
  if (!ds.length) throw new Loi(422, 'Chưa chọn đơn vị.');
  res.json({ SoMoi: await kySv.giaoDonVi(db, Number(req.params.id), ds, req.nguoi) });
}));
r.delete('/giao/:id', chuTri, bat(async (req, res) => { await kySv.boGiao(db, Number(req.params.id)); res.json({ ok: true }); }));
r.post('/ky/:id/mo', chuTri, bat(async (req, res) => { await kySv.moKy(db, Number(req.params.id), req.nguoi); res.json({ ok: true }); }));
r.post('/giao/:id/giahan', chuTri, bat(async (req, res) => { await kySv.giaHan(db, Number(req.params.id), (req.body || {}).HanMoi, req.nguoi); res.json({ ok: true }); }));
r.get('/ky/:id/thongke-chot', chuTri, bat(async (req, res) => res.json(await kySv.thongKeChot(db, Number(req.params.id)))));
r.post('/ky/:id/chot', chuTri, bat(async (req, res) => res.json({ SoDonVi: await kySv.chotKy(db, Number(req.params.id), req.nguoi) })));

// ===== Kết quả (công khai điểm tổng và hạng sau khi chốt - BR19) =====
r.get('/ketqua/ky/:id', bat(async (req, res) => {
  const kq = await kySv.ketQuaKy(db, Number(req.params.id));
  res.json({ Ky: dinhDangKy(kq.Ky), KetQua: kq.KetQua });
}));

// Điểm chi tiết từng chỉ số, từng nhóm: đầu mối chỉ xem của đơn vị mình
r.get('/ketqua/giao/:id', bat(async (req, res) => {
  const ct = await kySv.chiTietDiem(db, Number(req.params.id));
  const n = req.nguoi;
  if (n.MaVaiTro === 'QUAN_TRI' || (n.MaVaiTro === 'DAU_MOI' && n.MaDV !== ct.MaDV)) throw new Loi(403, 'Bạn chỉ xem được điểm chi tiết của đơn vị mình. (BR19)');
  res.json(ct);
}));

// ===== So sánh các kỳ (UC 5.2), dashboard và xuất báo cáo (UC 5.3) - Lãnh đạo, Cán bộ chủ trì =====
r.get('/sosanh/ky/:id', xemTongHop, bat(async (req, res) => res.json(await tongHop.soSanh(db, Number(req.params.id)))));
r.get('/dashboard/ky/:id', xemTongHop, bat(async (req, res) => res.json(await tongHop.dashboard(db, Number(req.params.id)))));
r.get('/ketqua/ky/:id/xuat', xemTongHop, bat(async (req, res) => {
  const { buffer, tenTep } = await tongHop.xuatExcel(db, Number(req.params.id));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${tenTep}"`);
  res.send(buffer);
}));

// ===== Báo cáo số liệu của cán bộ đầu mối =====
const dauMoi = vaiTro('DAU_MOI');

// Các lượt giao của đơn vị mình
r.get('/baocao/luot-giao', dauMoi, bat(async (req, res) => {
  const ds = await db('HOSODANHGIA as g').join('KYDANHGIA as k', 'k.MaKy', 'g.MaKy').where({ 'g.MaDV': req.nguoi.MaDV }).whereNot({ 'k.TrangThaiKy': 'NHAP' })
    .select('g.MaHS', 'g.HanGiaHan', 'k.*').orderBy('k.NgayBatDau', 'desc');
  const kq = [];
  for (const x of ds) {
    const td = (await kySv.tienDo(db, x.MaKy)).find((t) => t.MaHS === x.MaHS);
    kq.push({ ...dinhDangKy(x), HanGiaHan: ymd(x.HanGiaHan), TienDo: td });
  }
  res.json(kq);
}));

// Danh sách chỉ số áp dụng của một lượt giao kèm báo cáo hiện có
r.get('/baocao/giao/:id', dauMoi, bat(async (req, res) => {
  const { giao, ky } = await bcSv.layGiao(db, Number(req.params.id));
  if (giao.MaDV !== req.nguoi.MaDV) throw new Loi(403, 'Bạn chỉ xem được báo cáo của đơn vị mình. (BR19)');
  const cs = await kySv.chiSoApDung(db, ky, giao.MaLoaiDV);
  const bcs = await db('BAOCAOSOLIEU').where({ MaHS: giao.MaHS });
  const mcs = bcs.length ? await db('MINHCHUNG').whereIn('MaBC', bcs.map((b) => b.MaBC)).where({ TrangThaiMC: 'HIEU_LUC' }).select('MaBC').count({ n: '*' }).groupBy('MaBC') : [];
  res.json({
    Giao: { MaHS: giao.MaHS, TenDV: giao.TenDV, HanHienHanh: kySv.hanHienHanh(ky, giao), DaQuaHan: kySv.daQuaHan(ky, giao) },
    Ky: dinhDangKy(ky),
    ChiSo: cs.map((c) => {
      const bc = bcs.find((b) => b.MaChiSo === c.MaChiSo);
      return {
        MaChiSo: c.MaChiSo, KyHieu: c.KyHieu, TenChiSo: c.TenChiSo, TenNhom: c.TenNhom, KieuCongThuc: c.KieuCongThuc, DonViTinh: c.DonViTinh,
        DiemToiDa: Number(c.DiemToiDa), BatBuocMinhChung: !!c.BatBuocMinhChung,
        MaBC: bc ? bc.MaBC : null, GiaTri: bc && bc.GiaTri !== null ? Number(bc.GiaTri) : null, TrangThaiBC: bc ? bc.TrangThaiBC : null,
        SoMinhChung: bc ? Number((mcs.find((m) => m.MaBC === bc.MaBC) || {}).n || 0) : 0,
      };
    }),
  });
}));

// UC 3.1 lưu nháp
r.put('/baocao/giao/:id/chiso/:maChiSo', dauMoi, bat(async (req, res) => {
  res.json(await bcSv.luuNhap(db, Number(req.params.id), Number(req.params.maChiSo), (req.body || {}).GiaTri, req.nguoi));
}));

// Chi tiết báo cáo: đầu mối đơn vị mình; chuyên viên đơn vị khác; chủ trì, lãnh đạo xem
r.get('/baocao/:id', bat(async (req, res) => {
  const ct = await bcSv.chiTietBaoCao(db, Number(req.params.id));
  kiemTraQuyenXem(req.nguoi, ct.MaDV);
  res.json(ct);
}));

function kiemTraQuyenXem(n, maDV) {
  if (n.MaVaiTro === 'QUAN_TRI') throw new Loi(403, 'Bạn không có quyền xem báo cáo số liệu.');
  if (n.MaVaiTro === 'DAU_MOI' && n.MaDV !== maDV) throw new Loi(403, 'Bạn chỉ xem được báo cáo của đơn vị mình. (BR19)');
  if (n.MaVaiTro === 'THAM_DINH' && n.MaDV === maDV) throw new Loi(403, 'Chuyên viên không thẩm định báo cáo của đơn vị mình. (BR18)');
}

// UC 3.2 đính kèm minh chứng: kiểm tra định dạng và dung lượng (BR05)
const taiLen = multer({
  storage: multer.diskStorage({
    destination: THU_MUC_TEP,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (C.DUOI_TEP.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Loi(422, 'Tệp không đúng định dạng. Chỉ nhận PDF, Word, Excel, JPG, PNG.'));
  },
}).single('tep');

r.post('/baocao/:id/minhchung', dauMoi, (req, res, next) => {
  taiLen(req, res, (e) => {
    if (e instanceof multer.MulterError) return next(new Loi(422, e.code === 'LIMIT_FILE_SIZE' ? `Tệp vượt quá ${MAX_MB} MB.` : 'Tải tệp thất bại.'));
    next(e);
  });
}, bat(async (req, res) => {
  if (!req.file) throw new Loi(422, 'Chưa chọn tệp.');
  try {
    // multer đọc tên tệp theo latin1, đổi lại UTF-8 để giữ tên tiếng Việt
    const tenTep = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const MaMC = await bcSv.themMinhChung(db, Number(req.params.id), { TenTep: tenTep.slice(0, 255), DuongDan: req.file.filename, DungLuong: req.file.size }, Number(req.body.MaLoaiMC), req.nguoi);
    res.status(201).json({ MaMC });
  } catch (e) {
    fs.rm(req.file.path, { force: true }, () => {}); // nghiệp vụ từ chối thì bỏ tệp vừa tải
    throw e;
  }
}));

r.post('/minhchung/:id/thaythe', dauMoi, bat(async (req, res) => { await bcSv.thayTheMinhChung(db, Number(req.params.id), req.nguoi); res.json({ ok: true }); }));

r.get('/minhchung/:id/tai', bat(async (req, res) => {
  const mc = await db('MINHCHUNG').where({ MaMC: Number(req.params.id) }).first();
  if (!mc) throw new Loi(404, 'Không tìm thấy minh chứng.');
  const { giao } = await bcSv.layBaoCao(db, mc.MaBC);
  kiemTraQuyenXem(req.nguoi, giao.MaDV);
  const duongDan = path.join(THU_MUC_TEP, path.basename(mc.DuongDan)); // basename chống truy cập ra ngoài thư mục tệp
  if (!fs.existsSync(duongDan)) throw new Loi(404, 'Tệp không còn trên máy chủ.');
  res.download(duongDan, mc.TenTep);
}));

// UC 3.3 / 3.4 gửi và gửi lại
r.post('/baocao/:id/gui', dauMoi, bat(async (req, res) => { await bcSv.guiBaoCao(db, Number(req.params.id), req.nguoi); res.json({ ok: true }); }));

// ===== Thẩm định =====
const thamDinh = vaiTro('THAM_DINH');
r.get('/thamdinh/cho', thamDinh, bat(async (req, res) => {
  res.json((await bcSv.danhSachCho(db, req.nguoi)).map((x) => ({ ...x, NgayGui: new Date(x.NgayGui) })));
}));
r.post('/thamdinh/:maBC/ketluan', thamDinh, bat(async (req, res) => {
  const b = req.body || {};
  await bcSv.ketLuan(db, Number(req.params.maBC), b.KetLuan, b.NhanXet, req.nguoi);
  res.json({ ok: true });
}));
// UC 4.4 lịch sử các vòng đã thẩm định của chính chuyên viên
r.get('/thamdinh/lichsu', thamDinh, bat(async (req, res) => {
  const ds = await db('PHIEUTHAMDINH as t').join('BAOCAOSOLIEU as b', 'b.MaBC', 't.MaBC').join('HOSODANHGIA as g', 'g.MaHS', 'b.MaHS')
    .join('KYDANHGIA as k', 'k.MaKy', 'g.MaKy').join('DONVI as d', 'd.MaDV', 'g.MaDV').join('CHISO as c', 'c.MaChiSo', 'b.MaChiSo')
    .where({ 't.MaChuyenVien': req.nguoi.MaND })
    .select('t.MaPhieuTD', 't.MaBC', 't.VongThamDinh', 't.KetLuan', 't.NhanXet', 't.NgayThamDinh', 'k.TenKy', 'd.TenDV', 'c.KyHieu', 'c.TenChiSo', 'b.TrangThaiBC')
    .orderBy('t.MaPhieuTD', 'desc').limit(200);
  res.json(ds.map((x) => ({ ...x, NgayThamDinh: new Date(x.NgayThamDinh) })));
}));

module.exports = r;
