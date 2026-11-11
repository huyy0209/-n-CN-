// Logic tính điểm (BR01, BR02, BR10, BR12, BR23). Hàm thuần, không đụng CSDL, để test độc lập.

/**
 * Điểm của một chỉ số theo kiểu công thức (BR01). Kết quả nằm trong [0, DiemToiDa].
 * @param chiSo   { KieuCongThuc, ChieuTot, ChiTieu, DiemToiDa }
 * @param bacDiem danh sách { TuGiaTri, DenGiaTri, Diem } (chỉ dùng cho kiểu bậc thang)
 * @param giaTri  giá trị báo cáo; null = không có số liệu
 */
function diemChiSo(chiSo, bacDiem, giaTri) {
  if (giaTri === null || giaTri === undefined) return 0;
  const v = Number(giaTri);
  const toiDa = Number(chiSo.DiemToiDa);
  let diem = 0;
  if (chiSo.KieuCongThuc === 'CO_KHONG') {
    diem = v === 1 ? toiDa : 0;
  } else if (chiSo.KieuCongThuc === 'TY_LE') {
    const chiTieu = Number(chiSo.ChiTieu);
    let tyLe;
    if (chiSo.ChieuTot === 'THAP_TOT') {
      // Thấp tốt: bằng hoặc thấp hơn chỉ tiêu thì đủ điểm, cao hơn thì giảm dần
      tyLe = v <= chiTieu ? 1 : chiTieu / v;
    } else {
      // Cao tốt: min(giá trị / chỉ tiêu; 1)
      tyLe = chiTieu > 0 ? Math.min(v / chiTieu, 1) : 0;
    }
    diem = Math.max(tyLe, 0) * toiDa;
  } else if (chiSo.KieuCongThuc === 'BAC_THANG') {
    // Tra bậc: TuGiaTri <= v <= DenGiaTri; DenGiaTri rỗng = không giới hạn trên
    const bac = (bacDiem || []).find(
      (b) => v >= Number(b.TuGiaTri) && (b.DenGiaTri === null || b.DenGiaTri === undefined || v <= Number(b.DenGiaTri))
    );
    diem = bac ? Number(bac.Diem) : 0;
  }
  return Math.min(Math.max(diem, 0), toiDa);
}

/**
 * Tổng điểm thang 100 của một đơn vị (BR02).
 * @param nhoms   [{ MaNhom, TenNhom, TrongSo }] - mọi nhóm của bộ
 * @param chiSos  [{ MaChiSo, MaNhom, DiemToiDa }] - các chỉ số ÁP DỤNG cho đơn vị trong kỳ
 * @param diemMap Map(MaChiSo -> điểm đạt); thiếu = 0 điểm (BR10)
 * Nhóm không có chỉ số áp dụng bị loại, trọng số các nhóm còn lại chia lại cho đủ 100%.
 */
function tinhTongDiem(nhoms, chiSos, diemMap) {
  const chiTiet = [];
  let tongTrongSo = 0;
  let tongDongGop = 0;
  for (const nhom of nhoms) {
    const cs = chiSos.filter((c) => c.MaNhom === nhom.MaNhom);
    if (cs.length === 0) continue; // nhóm không áp dụng
    const toiDa = cs.reduce((s, c) => s + Number(c.DiemToiDa), 0);
    const dat = cs.reduce((s, c) => s + (diemMap.get(c.MaChiSo) || 0), 0);
    const tyLe = toiDa > 0 ? dat / toiDa : 0;
    const trongSo = Number(nhom.TrongSo);
    tongTrongSo += trongSo;
    tongDongGop += tyLe * trongSo;
    chiTiet.push({ MaNhom: nhom.MaNhom, TenNhom: nhom.TenNhom, Dat: dat, ToiDa: toiDa, TyLe: tyLe, TrongSo: trongSo, DongGop: tyLe * trongSo });
  }
  // Giữ đủ số lẻ ở bước trung gian, chỉ làm tròn 2 chữ số ở tổng điểm (BR23)
  const tong = tongTrongSo > 0 ? lamTron2((tongDongGop / tongTrongSo) * 100) : 0;
  return { TongDiem: tong, TongTrongSo: tongTrongSo, Nhom: chiTiet };
}

function lamTron2(x) {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

/**
 * Xếp hạng theo điểm giảm dần; đồng điểm thì đồng hạng (BR12), hạng kế tiếp nhảy cóc (1, 1, 3).
 * @param ds [{ id, diem }] -> Map(id -> hạng)
 */
function xepHang(ds) {
  const sapXep = [...ds].sort((a, b) => b.diem - a.diem);
  const hang = new Map();
  sapXep.forEach((x, i) => {
    if (i > 0 && x.diem === sapXep[i - 1].diem) hang.set(x.id, hang.get(sapXep[i - 1].id));
    else hang.set(x.id, i + 1);
  });
  return hang;
}

/** Xác định mức độ theo ngưỡng của bộ: DiemTu <= điểm < DiemDen, riêng mức cao nhất lấy cả DiemDen. */
function xacDinhMucDo(mucDos, tongDiem) {
  const ds = [...mucDos].sort((a, b) => Number(a.DiemTu) - Number(b.DiemTu));
  for (let i = 0; i < ds.length; i++) {
    const cuoi = i === ds.length - 1;
    if (tongDiem >= Number(ds[i].DiemTu) && (tongDiem < Number(ds[i].DiemDen) || (cuoi && tongDiem <= Number(ds[i].DiemDen)))) return ds[i];
  }
  return null;
}

module.exports = { diemChiSo, tinhTongDiem, xepHang, xacDinhMucDo, lamTron2 };
