// Use Case 1.5 - Quản lý bộ chỉ số theo phiên bản (BR14, RB05, RB06, RB08, RB09, RB13).
const { them } = require('../db');
const { Loi, ghiNhatKy } = require('./common');
const { homNayVN } = require('../lib/dates');

// Đọc toàn bộ cây của một bộ: nhóm -> chỉ số (kèm bậc điểm, loại đơn vị áp dụng), mức độ
async function layBo(trx, maBo) {
  const bo = await trx('BOCHISO').where({ MaBo: maBo }).first();
  if (!bo) throw new Loi(404, 'Không tìm thấy bộ chỉ số.');
  const nhoms = await trx('NHOMCHISO').where({ MaBo: maBo }).orderBy('MaNhom');
  const maNhoms = nhoms.map((n) => n.MaNhom);
  const chiSos = maNhoms.length ? await trx('CHISO').whereIn('MaNhom', maNhoms).orderBy('MaChiSo') : [];
  const maCS = chiSos.map((c) => c.MaChiSo);
  const bacs = maCS.length ? await trx('BACDIEM').whereIn('MaChiSo', maCS).orderBy('TuGiaTri') : [];
  const apDung = maCS.length ? await trx('CHISO_LOAIDONVI').whereIn('MaChiSo', maCS) : [];
  const mucDos = await trx('MUCDOCHUYENDOISO').where({ MaBo: maBo }).orderBy('DiemTu');
  for (const c of chiSos) {
    c.BatBuocMinhChung = !!c.BatBuocMinhChung;
    c.BacDiem = bacs.filter((b) => b.MaChiSo === c.MaChiSo);
    c.LoaiDonVi = apDung.filter((a) => a.MaChiSo === c.MaChiSo).map((a) => a.MaLoaiDV);
  }
  for (const n of nhoms) n.ChiSo = chiSos.filter((c) => c.MaNhom === n.MaNhom);
  return { ...bo, Nhom: nhoms, MucDo: mucDos };
}

// Bộ phải ở trạng thái Nháp mới được sửa; bộ đã ban hành bị khóa, muốn đổi thì sao chép (BR14)
// Bộ đã ban hành thì khóa: không sửa nhóm, chỉ số, bậc điểm, mức độ (RB13)
async function yeuCauNhap(trx, maBo) {
  const bo = await trx('BOCHISO').where({ MaBo: maBo }).first();
  if (!bo) throw new Loi(404, 'Không tìm thấy bộ chỉ số.');
  if (bo.TrangThaiBo !== 'NHAP') throw new Loi(409, 'Bộ chỉ số đã khóa. Hãy sao chép thành bộ mới để chỉnh sửa.');
  return bo;
}

// Kiểm tra trước khi ban hành, trả danh sách lỗi (rỗng = đạt)
function kiemTraBanHanh(bo) {
  const loi = [];
  if (bo.Nhom.length === 0) loi.push('Bộ chưa có nhóm chỉ số nào.');
  const tongTrongSo = bo.Nhom.reduce((s, n) => s + Number(n.TrongSo), 0);
  if (Math.abs(tongTrongSo - 100) > 0.001) loi.push(`Tổng trọng số các nhóm phải bằng 100 (hiện là ${tongTrongSo}). (RB08)`);
  for (const n of bo.Nhom) {
    if (n.ChiSo.length === 0) loi.push(`Nhóm "${n.TenNhom}" chưa có chỉ số nào.`);
    for (const c of n.ChiSo) {
      const ten = c.KyHieu || c.TenChiSo;
      if (c.LoaiDonVi.length === 0) loi.push(`Chỉ số ${ten} chưa áp dụng cho loại đơn vị nào.`);
      if (!(Number(c.DiemToiDa) > 0)) loi.push(`Chỉ số ${ten}: điểm tối đa phải lớn hơn 0. (RB05)`);
      if (c.KieuCongThuc === 'TY_LE') {
        const ct = c.ChiTieu === null ? NaN : Number(c.ChiTieu);
        if (!(ct > 0)) loi.push(`Chỉ số ${ten}: kiểu tỷ lệ cần chỉ tiêu lớn hơn 0.`);
        else if (ct < Number(c.GiaTriMin) || ct > Number(c.GiaTriMax)) loi.push(`Chỉ số ${ten}: chỉ tiêu phải nằm trong miền giá trị. (RB05)`);
      }
      if (c.KieuCongThuc === 'BAC_THANG') {
        if (c.BacDiem.length === 0) loi.push(`Chỉ số ${ten}: kiểu bậc thang cần ít nhất một bậc điểm.`);
        const bacs = [...c.BacDiem].sort((a, b) => Number(a.TuGiaTri) - Number(b.TuGiaTri));
        bacs.forEach((b, i) => {
          if (Number(b.Diem) < 0 || Number(b.Diem) > Number(c.DiemToiDa)) loi.push(`Chỉ số ${ten}: điểm của bậc phải từ 0 đến điểm tối đa.`);
          if (i < bacs.length - 1 && (b.DenGiaTri === null || Number(b.DenGiaTri) >= Number(bacs[i + 1].TuGiaTri))) {
            loi.push(`Chỉ số ${ten}: các bậc điểm bị chồng khoảng. (RB09)`);
          }
        });
      }
    }
  }
  // Mức độ: không chồng khoảng và phủ kín 0-100 (RB09)
  const md = [...bo.MucDo].sort((a, b) => Number(a.DiemTu) - Number(b.DiemTu));
  if (md.length === 0) loi.push('Bộ chưa khai báo ngưỡng mức độ.');
  else {
    if (Number(md[0].DiemTu) !== 0 || Number(md[md.length - 1].DiemDen) !== 100) loi.push('Ngưỡng mức độ phải phủ từ 0 đến 100. (RB09)');
    for (let i = 0; i < md.length - 1; i++) {
      if (Number(md[i].DiemDen) !== Number(md[i + 1].DiemTu)) loi.push(`Ngưỡng mức độ "${md[i].TenMucDo}" và "${md[i + 1].TenMucDo}" phải nối liền nhau (điểm đến = điểm từ của mức kế). (RB09)`);
    }
  }
  return loi;
}

async function banHanh(db, maBo, nguoi, now = new Date()) {
  return db.transaction(async (trx) => {
    await yeuCauNhap(trx, maBo);
    const bo = await layBo(trx, maBo);
    const loi = kiemTraBanHanh(bo);
    if (loi.length) throw new Loi(422, 'Bộ chỉ số chưa đạt kiểm tra để ban hành.', loi);
    await trx('BOCHISO').where({ MaBo: maBo }).update({ TrangThaiBo: 'BAN_HANH', NgayBanHanh: homNayVN(now) });
    await ghiNhatKy(trx, nguoi.MaND, 'BAN_HANH_BO', `Bộ chỉ số #${maBo} - ${bo.TenBo}`, now);
  });
}

// Sao chép toàn bộ nhóm, chỉ số, bậc điểm, mức độ, loại đơn vị áp dụng thành bộ mới ở trạng thái Nháp
async function saoChep(db, maBo, tenMoi) {
  return db.transaction(async (trx) => {
    const nguon = await layBo(trx, maBo);
    const maBoMoi = await them(trx, 'BOCHISO', { TenBo: tenMoi || `${nguon.TenBo} (bản sao)`, CanCuPhapLy: nguon.CanCuPhapLy, TrangThaiBo: 'NHAP' }, 'MaBo');
    for (const n of nguon.Nhom) {
      const maNhom = await them(trx, 'NHOMCHISO', { TenNhom: n.TenNhom, TrongSo: n.TrongSo, MaBo: maBoMoi }, 'MaNhom');
      for (const c of n.ChiSo) await themChiSo(trx, maNhom, c);
    }
    for (const m of nguon.MucDo) await trx('MUCDOCHUYENDOISO').insert({ TenMucDo: m.TenMucDo, DiemTu: m.DiemTu, DiemDen: m.DiemDen, MaBo: maBoMoi });
    return maBoMoi;
  });
}

// Chuẩn hóa dữ liệu chỉ số từ form
function dongChiSo(c) {
  const kieu = c.KieuCongThuc;
  return {
    KyHieu: c.KyHieu || null,
    TenChiSo: c.TenChiSo,
    DiemToiDa: c.DiemToiDa,
    KieuCongThuc: kieu,
    ChieuTot: c.ChieuTot || 'CAO_TOT',
    ChiTieu: kieu === 'TY_LE' ? c.ChiTieu : null,
    // Kiểu có/không chỉ nhận 0 hoặc 1
    GiaTriMin: kieu === 'CO_KHONG' ? 0 : (c.GiaTriMin ?? 0),
    GiaTriMax: kieu === 'CO_KHONG' ? 1 : c.GiaTriMax,
    DonViTinh: c.DonViTinh || null,
    TanSuat: c.TanSuat,
    BatBuocMinhChung: !!c.BatBuocMinhChung,
  };
}

async function ghiPhuChiSo(trx, maChiSo, c) {
  await trx('BACDIEM').where({ MaChiSo: maChiSo }).del();
  await trx('CHISO_LOAIDONVI').where({ MaChiSo: maChiSo }).del();
  if (c.KieuCongThuc === 'BAC_THANG') {
    for (const b of c.BacDiem || []) {
      await trx('BACDIEM').insert({ TuGiaTri: b.TuGiaTri, DenGiaTri: b.DenGiaTri === '' ? null : (b.DenGiaTri ?? null), Diem: b.Diem, MaChiSo: maChiSo });
    }
  }
  for (const maLoai of [...new Set(c.LoaiDonVi || [])]) await trx('CHISO_LOAIDONVI').insert({ MaChiSo: maChiSo, MaLoaiDV: maLoai });
}

async function themChiSo(trx, maNhom, c) {
  const maChiSo = await them(trx, 'CHISO', { ...dongChiSo(c), MaNhom: maNhom }, 'MaChiSo');
  await ghiPhuChiSo(trx, maChiSo, c);
  return maChiSo;
}

async function suaChiSo(trx, maChiSo, c) {
  await trx('CHISO').where({ MaChiSo: maChiSo }).update(dongChiSo(c));
  await ghiPhuChiSo(trx, maChiSo, c);
}

async function xoaChiSo(trx, maChiSo) {
  await trx('BACDIEM').where({ MaChiSo: maChiSo }).del();
  await trx('CHISO_LOAIDONVI').where({ MaChiSo: maChiSo }).del();
  await trx('CHISO').where({ MaChiSo: maChiSo }).del();
}

module.exports = { layBo, yeuCauNhap, kiemTraBanHanh, banHanh, saoChep, themChiSo, suaChiSo, xoaChiSo };
