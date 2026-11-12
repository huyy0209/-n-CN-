// Nhóm Use Case 5: so sánh các kỳ (5.2), dashboard và xuất báo cáo (5.3). Chỉ đọc, không đổi dữ liệu.
const ExcelJS = require('exceljs');
const { Loi } = require('./common');
const { ymd } = require('../lib/dates');
const { layKy, ketQuaKy, diemTatCa, ddmmyyyy } = require('./ky');
const { lamTron2 } = require('../lib/scoring');

// Kết quả đã lưu khi chốt, ghép với điểm nhóm và điểm chỉ số tính lại từ báo cáo (BR11)
async function ketQuaDayDu(trx, maKy) {
  const { Ky, KetQua } = await ketQuaKy(trx, maKy); // ném lỗi nếu kỳ chưa chốt
  const chiTiet = await diemTatCa(trx, maKy);
  return {
    Ky,
    DonVi: KetQua.map((k) => {
      const ct = chiTiet.find((c) => c.MaGiao === k.MaGiao);
      return { ...k, TongTrongSo: ct.TongTrongSo, Nhom: ct.Nhom, ChiSo: ct.ChiSo };
    }),
  };
}

// Kỳ đã chốt liền trước cùng loại (kỳ quý so với kỳ quý, kỳ năm so với kỳ năm)
async function kyLienTruoc(trx, ky) {
  const ds = await trx('KYDANHGIA').where({ TrangThaiKy: 'DA_CHOT', LoaiKy: ky.LoaiKy }).whereNot({ MaKy: ky.MaKy });
  const truoc = ds.filter((k) => ymd(k.NgayBatDau) < ymd(ky.NgayBatDau)).sort((a, b) => (ymd(a.NgayBatDau) < ymd(b.NgayBatDau) ? 1 : -1));
  return truoc[0] || null;
}

const hieu = (a, b) => (a === null || a === undefined || b === null || b === undefined ? null : lamTron2(a - b));

// UC 5.2 - So sánh kỳ được chọn với kỳ liền trước cùng loại
async function soSanh(trx, maKy) {
  const nay = await ketQuaDayDu(trx, maKy);
  const kyTruoc = await kyLienTruoc(trx, nay.Ky);
  const truoc = kyTruoc ? await ketQuaDayDu(trx, kyTruoc.MaKy) : null;
  const cungBo = !!truoc && truoc.Ky.MaBo === nay.Ky.MaBo; // khác bộ thì không so từng chỉ số (6a)

  const motDong = (n, t) => {
    const goc = n || t;
    // Điểm nhóm so theo tên nhóm để vẫn so được khi hai kỳ khác bộ chỉ số
    const tenNhom = [...new Set([...(n ? n.Nhom : []), ...(t ? t.Nhom : [])].map((x) => x.TenNhom))];
    const dong = {
      MaDV: goc.MaDV, TenDV: goc.TenDV, MaLoaiDV: goc.MaLoaiDV, TenLoaiDV: goc.TenLoaiDV,
      CoKyNay: !!n, CoKyTruoc: !!t,
      Diem: n ? n.TongDiem : null, DiemTruoc: t ? t.TongDiem : null, ChenhDiem: hieu(n && n.TongDiem, t && t.TongDiem),
      Hang: n ? n.HangTheoLoai : null, HangTruoc: t ? t.HangTheoLoai : null,
      // Số dương = lên hạng (hạng nhỏ hơn là tốt hơn)
      ChenhHang: n && t ? t.HangTheoLoai - n.HangTheoLoai : null,
      HangChung: n ? n.HangChung : null, HangChungTruoc: t ? t.HangChung : null,
      MucDo: n ? n.TenMucDo : null, MucDoTruoc: t ? t.TenMucDo : null,
      Nhom: tenNhom.map((ten) => {
        const a = n && n.Nhom.find((x) => x.TenNhom === ten);
        const b = t && t.Nhom.find((x) => x.TenNhom === ten);
        const pt = (x) => (x ? lamTron2(x.TyLe * 100) : null); // điểm nhóm quy về thang 100
        return { TenNhom: ten, Diem: pt(a), DiemTruoc: pt(b), Chenh: hieu(pt(a), pt(b)) };
      }),
    };
    if (cungBo && n && t) {
      dong.ChiSo = n.ChiSo.map((c) => {
        const cu = t.ChiSo.find((x) => x.MaChiSo === c.MaChiSo);
        return { KyHieu: c.KyHieu, TenChiSo: c.TenChiSo, DiemToiDa: c.DiemToiDa, Diem: c.Diem, DiemTruoc: cu ? cu.Diem : null, Chenh: hieu(c.Diem, cu && cu.Diem) };
      });
    }
    return dong;
  };

  const maDVs = [...new Set([...nay.DonVi.map((d) => d.MaDV), ...(truoc ? truoc.DonVi.map((d) => d.MaDV) : [])])];
  const donVi = maDVs.map((ma) => motDong(nay.DonVi.find((d) => d.MaDV === ma), truoc && truoc.DonVi.find((d) => d.MaDV === ma)));
  // Đơn vị có ở kỳ này xếp trước theo hạng; đơn vị chỉ có ở kỳ trước xếp cuối
  donVi.sort((a, b) => (a.CoKyNay === b.CoKyNay ? (a.HangChung ?? a.HangChungTruoc) - (b.HangChung ?? b.HangChungTruoc) : a.CoKyNay ? -1 : 1));
  const tomTat = (k) => ({ MaKy: k.MaKy, TenKy: k.TenKy, LoaiKy: k.LoaiKy, MaBo: k.MaBo, NgayChot: ymd(k.NgayChot) });
  return { Ky: tomTat(nay.Ky), KyTruoc: truoc ? tomTat(truoc.Ky) : null, CungBo: cungBo, DonVi: donVi };
}

const trungBinh = (ds) => (ds.length ? lamTron2(ds.reduce((s, x) => s + x, 0) / ds.length) : null);

// UC 5.3 - Số liệu cho dashboard của một kỳ đã chốt
async function dashboard(trx, maKy) {
  const { Ky, DonVi } = await ketQuaDayDu(trx, maKy);
  const mucDos = await trx('MUCDOCHUYENDOISO').where({ MaBo: Ky.MaBo }).orderBy('DiemTu', 'desc');
  const loai = [...new Set(DonVi.map((d) => d.TenLoaiDV))].sort();
  const tenNhom = [...new Set(DonVi.flatMap((d) => d.Nhom.map((n) => n.TenNhom)))];
  const sapXep = [...DonVi].sort((a, b) => b.TongDiem - a.TongDiem);
  return {
    Ky: { MaKy: Ky.MaKy, TenKy: Ky.TenKy, LoaiKy: Ky.LoaiKy, NgayChot: ymd(Ky.NgayChot) },
    SoDonVi: DonVi.length,
    DiemTrungBinh: trungBinh(DonVi.map((d) => d.TongDiem)),
    CaoNhat: sapXep[0] ? { TenDV: sapXep[0].TenDV, TongDiem: sapXep[0].TongDiem } : null,
    ThapNhat: sapXep.length ? { TenDV: sapXep[sapXep.length - 1].TenDV, TongDiem: sapXep[sapXep.length - 1].TongDiem } : null,
    TheoLoai: loai.map((ten) => { const ds = DonVi.filter((d) => d.TenLoaiDV === ten); return { TenLoaiDV: ten, SoDonVi: ds.length, DiemTrungBinh: trungBinh(ds.map((d) => d.TongDiem)) }; }),
    TheoMucDo: mucDos.map((m) => ({ TenMucDo: m.TenMucDo, DiemTu: Number(m.DiemTu), DiemDen: Number(m.DiemDen), SoDonVi: DonVi.filter((d) => d.TenMucDo === m.TenMucDo).length })),
    // Điểm nhóm trung bình (thang 100) của các đơn vị có nhóm đó áp dụng
    TheoNhom: tenNhom.map((ten) => { const ds = DonVi.map((d) => d.Nhom.find((n) => n.TenNhom === ten)).filter(Boolean); return { TenNhom: ten, SoDonVi: ds.length, DiemTrungBinh: trungBinh(ds.map((n) => n.TyLe * 100)) }; }),
    DonVi: sapXep.map((d) => ({ MaDV: d.MaDV, TenDV: d.TenDV, TenLoaiDV: d.TenLoaiDV, TongDiem: d.TongDiem, HangTheoLoai: d.HangTheoLoai, HangChung: d.HangChung, TenMucDo: d.TenMucDo })),
  };
}

// UC 5.3 - Xuất báo cáo kết quả kỳ ra tệp Excel (.xlsx): tổng hợp chung, theo loại, điểm nhóm, điểm chỉ số
async function xuatExcel(trx, maKy) {
  const { Ky, DonVi } = await ketQuaDayDu(trx, maKy);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hệ thống theo dõi chỉ số chuyển đổi số';
  const dam = (ws, soDong = 1) => { ws.getRow(soDong).font = { bold: true }; ws.views = [{ state: 'frozen', ySplit: soDong }]; };
  const tieuDe = `${Ky.TenKy} - chốt ngày ${ddmmyyyy(Ky.NgayChot)}`;

  const chung = wb.addWorksheet('Tổng hợp chung');
  chung.columns = [{ width: 10 }, { width: 38 }, { width: 28 }, { width: 12 }, { width: 14 }, { width: 16 }];
  chung.addRow([tieuDe]);
  chung.addRow(['Hạng chung', 'Đơn vị', 'Loại đơn vị', 'Tổng điểm', 'Hạng theo loại', 'Mức độ']);
  for (const d of [...DonVi].sort((a, b) => a.HangChung - b.HangChung)) chung.addRow([d.HangChung, d.TenDV, d.TenLoaiDV, d.TongDiem, d.HangTheoLoai, d.TenMucDo || '']);
  chung.getRow(1).font = { bold: true, size: 13 };
  dam(chung, 2);

  const theoLoai = wb.addWorksheet('Xếp hạng theo loại');
  theoLoai.columns = [{ width: 28 }, { width: 14 }, { width: 38 }, { width: 12 }, { width: 16 }];
  theoLoai.addRow(['Loại đơn vị', 'Hạng theo loại', 'Đơn vị', 'Tổng điểm', 'Mức độ']);
  for (const d of [...DonVi].sort((a, b) => a.TenLoaiDV.localeCompare(b.TenLoaiDV, 'vi') || a.HangTheoLoai - b.HangTheoLoai)) theoLoai.addRow([d.TenLoaiDV, d.HangTheoLoai, d.TenDV, d.TongDiem, d.TenMucDo || '']);
  dam(theoLoai);

  const tenNhom = [...new Set(DonVi.flatMap((d) => d.Nhom.map((n) => n.TenNhom)))];
  const nhom = wb.addWorksheet('Điểm nhóm');
  nhom.columns = [{ width: 38 }, ...tenNhom.map(() => ({ width: 22 })), { width: 18 }, { width: 12 }];
  nhom.addRow(['Đơn vị', ...tenNhom.map((t) => `${t} (đạt/tối đa)`), 'Trọng số áp dụng', 'Tổng điểm']);
  for (const d of DonVi) nhom.addRow([d.TenDV, ...tenNhom.map((t) => { const n = d.Nhom.find((x) => x.TenNhom === t); return n ? `${lamTron2(n.Dat)}/${lamTron2(n.ToiDa)}` : 'Không áp dụng'; }), d.TongTrongSo, d.TongDiem]);
  dam(nhom);

  const chiSo = wb.addWorksheet('Điểm chỉ số');
  chiSo.columns = [{ width: 34 }, { width: 8 }, { width: 50 }, { width: 28 }, { width: 12 }, { width: 16 }, { width: 10 }, { width: 10 }];
  chiSo.addRow(['Đơn vị', 'Mã', 'Chỉ số', 'Nhóm', 'Giá trị', 'Trạng thái', 'Điểm', 'Tối đa']);
  const NHAN = { NHAP: 'Nháp', CHO_THAM_DINH: 'Chờ thẩm định', CAN_BO_SUNG: 'Cần bổ sung', DAT: 'Đạt' };
  for (const d of DonVi) for (const c of d.ChiSo) chiSo.addRow([d.TenDV, c.KyHieu || '', c.TenChiSo, c.TenNhom, c.GiaTri === null ? '' : c.GiaTri, c.TrangThaiBC ? NHAN[c.TrangThaiBC] : 'Không nộp', lamTron2(c.Diem), c.DiemToiDa]);
  dam(chiSo);

  return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), tenTep: `ket-qua-ky-${Ky.MaKy}.xlsx` };
}

module.exports = { soSanh, dashboard, xuatExcel, kyLienTruoc };
