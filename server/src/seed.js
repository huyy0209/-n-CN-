// Dữ liệu mẫu: bộ chỉ số minh họa Phụ lục B, đơn vị, tài khoản 5 vai trò, 3 kỳ đánh giá.
// Dữ liệu nghiệp vụ được tạo qua chính các hàm dịch vụ (nhập, gửi, thẩm định, chốt) để đúng mọi quy tắc.
// Chạy: npm run db:seed
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { them } = require('./db');
const bochiso = require('./services/bochiso');
const kySv = require('./services/ky');
const bcSv = require('./services/baocao');

const MAT_KHAU_MAU = '123456';
const THU_MUC_TEP = path.join(__dirname, '..', 'uploads');
const vn = (s) => new Date(`${s}+07:00`); // thời điểm theo giờ Việt Nam

async function seed(db) {
  if (await db('VAITRO').first()) throw new Error('CSDL đã có dữ liệu. Dùng "npm run db:reset" để tạo lại từ đầu.');

  // --- Danh mục cố định ---
  await db('VAITRO').insert([
    { MaVaiTro: 'QUAN_TRI', TenVaiTro: 'Quản trị hệ thống', MoTa: 'Quản lý tài khoản, phân quyền, xem nhật ký' },
    { MaVaiTro: 'CHU_TRI', TenVaiTro: 'Cán bộ cơ quan chủ trì', MoTa: 'Quản lý danh mục, bộ chỉ số, kỳ đánh giá' },
    { MaVaiTro: 'DAU_MOI', TenVaiTro: 'Cán bộ đầu mối của đơn vị', MoTa: 'Nhập số liệu, minh chứng, gửi báo cáo của đơn vị mình' },
    { MaVaiTro: 'THAM_DINH', TenVaiTro: 'Chuyên viên thẩm định', MoTa: 'Kiểm tra và kết luận báo cáo của đơn vị khác' },
    { MaVaiTro: 'LANH_DAO', TenVaiTro: 'Lãnh đạo', MoTa: 'Xem tiến độ, kết quả, xếp hạng' },
  ]);
  const SO = await them(db, 'LOAIDONVI', { TenLoaiDV: 'Sở, ban, ngành' }, 'MaLoaiDV');
  const XA = await them(db, 'LOAIDONVI', { TenLoaiDV: 'UBND xã, phường, đặc khu' }, 'MaLoaiDV');
  const mcIds = [];
  for (const ten of ['Văn bản, quyết định', 'Báo cáo, thống kê', 'Ảnh chụp màn hình hệ thống', 'Biên bản, danh sách']) {
    mcIds.push(await them(db, 'LOAIMINHCHUNG', { TenLoaiMC: ten }, 'MaLoaiMC'));
  }

  // --- Đơn vị (mô hình chính quyền 2 cấp) ---
  const dv = {};
  for (const [k, ten, loai] of [
    ['skhcn', 'Sở Khoa học và Công nghệ', SO], ['syt', 'Sở Y tế', SO], ['snv', 'Sở Nội vụ', SO],
    ['pa', 'UBND Phường A', XA], ['xb', 'UBND Xã B', XA], ['dkc', 'UBND Đặc khu C', XA],
  ]) dv[k] = await them(db, 'DONVI', { TenDV: ten, Email: `${k}@example.gov.vn`, MaLoaiDV: loai }, 'MaDV');

  // --- Tài khoản mẫu ---
  const bam = bcrypt.hashSync(MAT_KHAU_MAU, 10);
  const nd = {};
  for (const [tenDN, hoTen, vaiTro, k] of [
    ['admin', 'Quản trị hệ thống', 'QUAN_TRI', 'skhcn'], ['chutri', 'Nguyễn Văn Chủ Trì', 'CHU_TRI', 'skhcn'], ['lanhdao', 'Trần Thị Lãnh Đạo', 'LANH_DAO', 'skhcn'],
    ['dm_skhcn', 'Đầu mối Sở KH&CN', 'DAU_MOI', 'skhcn'], ['dm_syt', 'Đầu mối Sở Y tế', 'DAU_MOI', 'syt'], ['dm_snv', 'Đầu mối Sở Nội vụ', 'DAU_MOI', 'snv'],
    ['dm_pa', 'Đầu mối Phường A', 'DAU_MOI', 'pa'], ['dm_xb', 'Đầu mối Xã B', 'DAU_MOI', 'xb'], ['dm_dkc', 'Đầu mối Đặc khu C', 'DAU_MOI', 'dkc'],
    ['td_skhcn', 'Thẩm định viên Sở KH&CN', 'THAM_DINH', 'skhcn'], ['td_syt', 'Thẩm định viên Sở Y tế', 'THAM_DINH', 'syt'],
  ]) {
    const MaND = await them(db, 'NGUOIDUNG', { HoTen: hoTen, TenDangNhap: tenDN, MatKhau: bam, Email: `${tenDN}@example.gov.vn`, TrangThaiTK: 'HOAT_DONG', MaVaiTro: vaiTro, MaDV: dv[k] }, 'MaND');
    nd[tenDN] = { MaND, MaVaiTro: vaiTro, MaDV: dv[k] };
  }

  // --- Bộ chỉ số minh họa (Phụ lục B, Bảng B.1) ---
  const maBo = await them(db, 'BOCHISO', { TenBo: 'Bộ chỉ số chuyển đổi số minh họa (Phụ lục B)', CanCuPhapLy: 'Bộ minh họa tự xây dựng, mô phỏng cấu trúc bộ chỉ số địa phương', TrangThaiBo: 'NHAP' }, 'MaBo');
  const N = {};
  for (const [k, ten, ts] of [['N1', 'Nhận thức số', 10], ['N2', 'Thể chế số', 15], ['N3', 'Hạ tầng số', 15], ['N4', 'Nhân lực số', 15], ['N5', 'An toàn thông tin mạng', 15], ['N6', 'Hoạt động chuyển đổi số', 30]]) {
    N[k] = await them(db, 'NHOMCHISO', { TenNhom: ten, TrongSo: ts, MaBo: maBo }, 'MaNhom');
  }
  const CA = [SO, XA];
  const coKhong = (ma, ten, nhom, toiDa, ts, ad) => ({ KyHieu: ma, TenChiSo: ten, nhom, DiemToiDa: toiDa, KieuCongThuc: 'CO_KHONG', TanSuat: ts, LoaiDonVi: ad, GiaTriMax: 1, BatBuocMinhChung: true });
  const tyLe = (ma, ten, nhom, toiDa, chiTieu, ts, ad) => ({ KyHieu: ma, TenChiSo: ten, nhom, DiemToiDa: toiDa, KieuCongThuc: 'TY_LE', ChiTieu: chiTieu, GiaTriMin: 0, GiaTriMax: 100, DonViTinh: '%', TanSuat: ts, LoaiDonVi: ad, BatBuocMinhChung: true });
  const bac = (ma, ten, nhom, toiDa, dvt, bacs, ts, ad, chieu = 'CAO_TOT') => ({ KyHieu: ma, TenChiSo: ten, nhom, DiemToiDa: toiDa, KieuCongThuc: 'BAC_THANG', ChieuTot: chieu, GiaTriMin: 0, GiaTriMax: 100000, DonViTinh: dvt, TanSuat: ts, LoaiDonVi: ad, BatBuocMinhChung: true, BacDiem: bacs.map(([TuGiaTri, DenGiaTri, Diem]) => ({ TuGiaTri, DenGiaTri, Diem })) });
  const dsChiSo = [
    coKhong('CS01', 'Có văn bản chỉ đạo chuyển đổi số trong năm', 'N1', 10, 'NAM', CA),
    bac('CS02', 'Số hoạt động tuyên truyền', 'N1', 10, 'hoạt động', [[0, 0, 0], [1, 2, 5], [3, 5, 8], [6, null, 10]], 'NAM', CA),
    coKhong('CS03', 'Ban hành kế hoạch chuyển đổi số năm', 'N2', 10, 'NAM', CA),
    tyLe('CS04', 'Tỷ lệ nhiệm vụ hoàn thành đúng hạn', 'N2', 15, 100, 'NAM', CA),
    tyLe('CS05', 'Tỷ lệ cán bộ có máy tính kết nối mạng', 'N3', 10, 100, 'NAM', CA),
    coKhong('CS06', 'Kết nối mạng truyền số liệu chuyên dùng', 'N3', 5, 'NAM', CA),
    coKhong('CS07', 'Có cán bộ chuyên trách chuyển đổi số', 'N4', 5, 'NAM', CA),
    tyLe('CS08', 'Tỷ lệ cán bộ tập huấn kỹ năng số', 'N4', 10, 80, 'QUY', CA),
    tyLe('CS09', 'Tỷ lệ hệ thống thông tin được phê duyệt cấp độ', 'N5', 10, 100, 'NAM', [SO]),
    bac('CS10', 'Số sự cố an toàn thông tin xử lý chậm', 'N5', 10, 'sự cố', [[0, 0, 10], [1, 1, 6], [2, 3, 3], [4, null, 0]], 'QUY', CA, 'THAP_TOT'),
    tyLe('CS11', 'Tỷ lệ hồ sơ thủ tục hành chính trực tuyến toàn trình', 'N6', 20, 80, 'QUY', CA),
    tyLe('CS12', 'Tỷ lệ văn bản đi ký số', 'N6', 10, 95, 'QUY', CA),
    tyLe('CS13', 'Tỷ lệ hộ gia đình có cáp quang', 'N6', 10, 85, 'NAM', [XA]),
    bac('CS14', 'Số hộ kinh doanh có gian hàng thương mại điện tử', 'N6', 10, 'hộ', [[0, 9, 0], [10, 29, 5], [30, 49, 8], [50, null, 10]], 'NAM', [XA]),
    coKhong('CS15', 'Chia sẻ dữ liệu lên kho dữ liệu dùng chung', 'N6', 10, 'NAM', [SO]),
  ];
  const CS = {};
  for (const c of dsChiSo) CS[c.KyHieu] = await bochiso.themChiSo(db, N[c.nhom], c);
  // Ngưỡng mức độ: báo cáo không quy định tên mức, đây là giá trị minh họa
  for (const [ten, tu, den] of [['Yếu', 0, 50], ['Trung bình', 50, 65], ['Khá', 65, 80], ['Tốt', 80, 90], ['Xuất sắc', 90, 100]]) {
    await db('MUCDOCHUYENDOISO').insert({ TenMucDo: ten, DiemTu: tu, DiemDen: den, MaBo: maBo });
  }
  await bochiso.banHanh(db, maBo, nd.chutri, vn('2024-11-15T09:00:00'));

  // --- Tệp minh chứng mẫu ---
  fs.mkdirSync(THU_MUC_TEP, { recursive: true });
  const tepMau = 'minh-chung-mau.pdf';
  const pdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 100]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 52>>stream\nBT /F1 14 Tf 20 50 Td (Minh chung mau - IS028) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n';
  fs.writeFileSync(path.join(THU_MUC_TEP, tepMau), pdf);
  const tep = { TenTep: 'Minh chứng mẫu.pdf', DuongDan: tepMau, DungLuong: Buffer.byteLength(pdf) };

  // Nhập + đính kèm + gửi một chỉ số; trả về MaBC
  async function nop(maGiao, nguoi, kyHieu, giaTri, luc, { gui = true } = {}) {
    const { MaBC } = await bcSv.luuNhap(db, maGiao, CS[kyHieu], giaTri, nguoi);
    await bcSv.themMinhChung(db, MaBC, tep, mcIds[0], nguoi, luc);
    if (gui) await bcSv.guiBaoCao(db, MaBC, nguoi, luc);
    return MaBC;
  }
  // Người thẩm định không cùng đơn vị với báo cáo (BR18)
  const nguoiTD = (maDV) => (maDV === dv.skhcn ? nd.td_syt : nd.td_skhcn);
  const maGiaoCua = async (maKy) => Object.fromEntries((await db('GIAODONVI').where({ MaKy: maKy })).map((g) => [g.MaDV, g.MaGiao]));
  const dauMoi = { [dv.skhcn]: nd.dm_skhcn, [dv.syt]: nd.dm_syt, [dv.snv]: nd.dm_snv, [dv.pa]: nd.dm_pa, [dv.xb]: nd.dm_xb, [dv.dkc]: nd.dm_dkc };
  const tatCaDV = Object.values(dv);

  // --- Kỳ năm 2025: đã chốt. Xã B dùng đúng số liệu Bảng B.2 -> tổng điểm 81,76 ---
  const kyNam = await kySv.taoKy(db, { TenKy: 'Kỳ năm 2025', LoaiKy: 'NAM', NgayBatDau: '2025-01-01', NgayKetThuc: '2025-12-31', HanNop: '2026-01-15', NgayChot: '2026-02-28', MaBo: maBo });
  await kySv.giaoDonVi(db, kyNam, tatCaDV, nd.chutri);
  await kySv.moKy(db, kyNam, nd.chutri, vn('2025-12-01T08:00:00'));
  const gNam = await maGiaoCua(kyNam);
  const soLieuNam = {
    [dv.skhcn]: { CS01: 1, CS02: 7, CS03: 1, CS04: 95, CS05: 100, CS06: 1, CS07: 1, CS09: 90, CS15: 1 },
    [dv.syt]: { CS01: 1, CS02: 3, CS03: 1, CS04: 80, CS05: 88, CS06: 1, CS07: 0, CS09: 60, CS15: 0 },
    [dv.snv]: { CS01: 1, CS02: 2, CS03: 1, CS04: 88, CS05: 96, CS06: 1, CS07: 1, CS09: 75, CS15: 1 },
    [dv.pa]: { CS01: 1, CS02: 6, CS03: 1, CS04: 90, CS05: 100, CS06: 1, CS07: 1, CS13: 80, CS14: 55 },
    [dv.xb]: { CS01: 1, CS02: 4, CS03: 1, CS04: 70, CS05: 92, CS06: 0, CS07: 1, CS13: 68, CS14: 35 }, // Bảng B.2
    [dv.dkc]: { CS01: 0, CS02: 1, CS03: 1, CS04: 60, CS05: 75, CS06: 0, CS07: 0, CS13: 40, CS14: 12 },
  };
  for (const maDV of tatCaDV) {
    for (const [kyHieu, giaTri] of Object.entries(soLieuNam[maDV])) {
      const maBC = await nop(gNam[maDV], dauMoi[maDV], kyHieu, giaTri, vn('2026-01-10T10:00:00'));
      await bcSv.ketLuan(db, maBC, 'DAT', 'Số liệu khớp minh chứng.', nguoiTD(maDV), vn('2026-01-25T14:00:00'));
    }
  }
  await kySv.chotKy(db, kyNam, nd.chutri, vn('2026-02-28T16:00:00'));

  // --- Kỳ quý 3 năm 2026: đang mở, đã qua hạn nộp -> dùng thử thẩm định và chốt kỳ ---
  const kyQ3 = await kySv.taoKy(db, { TenKy: 'Kỳ quý 3 năm 2026', LoaiKy: 'QUY', NgayBatDau: '2026-07-01', NgayKetThuc: '2026-09-30', HanNop: '2026-10-10', NgayChot: '2026-10-31', MaBo: maBo });
  await kySv.giaoDonVi(db, kyQ3, tatCaDV, nd.chutri);
  await kySv.moKy(db, kyQ3, nd.chutri, vn('2026-09-25T08:00:00'));
  const gQ3 = await maGiaoCua(kyQ3);
  const dungHan = vn('2026-10-08T09:00:00');
  const tre = vn('2026-10-14T09:00:00');
  const soLieuQ3 = { // [giá trị, thời điểm gửi, kết luận]
    [dv.skhcn]: { CS08: [85, dungHan, 'DAT'], CS10: [0, dungHan, 'DAT'], CS11: [78, dungHan, 'DAT'], CS12: [97, dungHan, 'DAT'] },
    [dv.syt]: { CS08: [60, dungHan, 'DAT'], CS10: [1, dungHan, 'DAT'], CS11: [52, dungHan, null], CS12: [90, dungHan, null] },
    [dv.snv]: { CS08: [72, tre, 'DAT'], CS10: [2, tre, 'DAT'], CS11: [65, tre, 'CHUA_DAT'], CS12: [93, tre, null] },
    [dv.pa]: { CS08: [80, dungHan, 'DAT'], CS10: [0, dungHan, 'DAT'], CS11: [84, dungHan, 'DAT'], CS12: [95, dungHan, 'DAT'] },
    [dv.xb]: { CS08: [64, dungHan, 'DAT'], CS10: [1, dungHan, null], CS11: [58, dungHan, null], CS12: [88, tre, null] },
    [dv.dkc]: { CS08: [40, tre, 'DAT'], CS10: [4, tre, null] }, // còn 2 chỉ số chưa nộp
  };
  for (const maDV of tatCaDV) {
    for (const [kyHieu, [giaTri, luc, kl]] of Object.entries(soLieuQ3[maDV])) {
      const maBC = await nop(gQ3[maDV], dauMoi[maDV], kyHieu, giaTri, luc);
      if (kl === 'DAT') await bcSv.ketLuan(db, maBC, 'DAT', null, nguoiTD(maDV), vn('2026-10-20T10:00:00'));
      if (kl === 'CHUA_DAT') await bcSv.ketLuan(db, maBC, 'CHUA_DAT', 'Số liệu chưa khớp báo cáo thống kê đính kèm, đề nghị bổ sung bảng tổng hợp hồ sơ quý 3.', nguoiTD(maDV), vn('2026-10-20T10:00:00'));
    }
  }

  // --- Kỳ quý 4 năm 2026: đang mở, còn hạn -> dùng thử nhập số liệu, gửi, gia hạn ---
  const kyQ4 = await kySv.taoKy(db, { TenKy: 'Kỳ quý 4 năm 2026', LoaiKy: 'QUY', NgayBatDau: '2026-10-01', NgayKetThuc: '2026-12-31', HanNop: '2027-01-10', NgayChot: '2027-01-31', MaBo: maBo });
  await kySv.giaoDonVi(db, kyQ4, tatCaDV, nd.chutri);
  await kySv.moKy(db, kyQ4, nd.chutri, vn('2026-11-01T08:00:00'));
  const gQ4 = await maGiaoCua(kyQ4);
  await nop(gQ4[dv.xb], nd.dm_xb, 'CS08', 70, vn('2026-11-05T09:00:00'), { gui: false }); // một báo cáo nháp sẵn

  // --- Hai kỳ đã chốt trước đó, để có dữ liệu cho So sánh các kỳ (UC 5.2) ---
  // Tạo sau cùng để mã của ba kỳ ở trên không đổi.
  async function kyDaChot(thongTin, soLieu, lucMo, lucGui, lucThamDinh, lucChot) {
    const maKy = await kySv.taoKy(db, { ...thongTin, MaBo: maBo });
    await kySv.giaoDonVi(db, maKy, Object.keys(soLieu).map(Number), nd.chutri);
    await kySv.moKy(db, maKy, nd.chutri, vn(lucMo));
    const g = await maGiaoCua(maKy);
    for (const maDV of Object.keys(soLieu).map(Number)) {
      for (const [kyHieu, giaTri] of Object.entries(soLieu[maDV])) {
        const maBC = await nop(g[maDV], dauMoi[maDV], kyHieu, giaTri, vn(lucGui));
        await bcSv.ketLuan(db, maBC, 'DAT', null, nguoiTD(maDV), vn(lucThamDinh));
      }
    }
    await kySv.chotKy(db, maKy, nd.chutri, vn(lucChot));
    return maKy;
  }
  // Kỳ năm 2024: Đặc khu C chưa được giao (đơn vị chỉ có mặt ở một kỳ)
  const kyNam2024 = await kyDaChot(
    { TenKy: 'Kỳ năm 2024', LoaiKy: 'NAM', NgayBatDau: '2024-01-01', NgayKetThuc: '2024-12-31', HanNop: '2025-01-15', NgayChot: '2025-02-28' },
    {
      [dv.skhcn]: { CS01: 1, CS02: 5, CS03: 1, CS04: 90, CS05: 98, CS06: 1, CS07: 1, CS09: 80, CS15: 0 },
      [dv.syt]: { CS01: 1, CS02: 2, CS03: 1, CS04: 85, CS05: 80, CS06: 0, CS07: 0, CS09: 50, CS15: 0 },
      [dv.snv]: { CS01: 0, CS02: 2, CS03: 1, CS04: 80, CS05: 90, CS06: 1, CS07: 1, CS09: 70, CS15: 0 },
      [dv.pa]: { CS01: 1, CS02: 4, CS03: 1, CS04: 85, CS05: 95, CS06: 1, CS07: 0, CS13: 72, CS14: 40 },
      [dv.xb]: { CS01: 1, CS02: 2, CS03: 0, CS04: 60, CS05: 85, CS06: 0, CS07: 1, CS13: 55, CS14: 20 },
    },
    '2024-12-01T08:00:00', '2025-01-10T10:00:00', '2025-01-25T14:00:00', '2025-02-28T16:00:00'
  );
  // Kỳ quý 2 năm 2026: kỳ quý liền trước của Kỳ quý 3 năm 2026
  const kyQ2 = await kyDaChot(
    { TenKy: 'Kỳ quý 2 năm 2026', LoaiKy: 'QUY', NgayBatDau: '2026-04-01', NgayKetThuc: '2026-06-30', HanNop: '2026-07-10', NgayChot: '2026-07-31' },
    {
      [dv.skhcn]: { CS08: 78, CS10: 1, CS11: 70, CS12: 96 },
      [dv.syt]: { CS08: 55, CS10: 0, CS11: 48, CS12: 85 },
      [dv.snv]: { CS08: 66, CS10: 2, CS11: 60, CS12: 90 },
      [dv.pa]: { CS08: 72, CS10: 0, CS11: 76, CS12: 92 },
      [dv.xb]: { CS08: 58, CS10: 1, CS11: 50, CS12: 80 },
      [dv.dkc]: { CS08: 30, CS10: 3, CS11: 35, CS12: 60 },
    },
    '2026-06-25T08:00:00', '2026-07-08T10:00:00', '2026-07-20T14:00:00', '2026-07-31T16:00:00'
  );

  return { dv, nd, CS, maBo, kyNam, kyQ3, kyQ4, kyNam2024, kyQ2 };
}

module.exports = { seed, MAT_KHAU_MAU };

if (require.main === module) {
  const { db } = require('./db');
  seed(db)
    .then(() => console.log(`Đã tạo dữ liệu mẫu. Mật khẩu mọi tài khoản mẫu: ${MAT_KHAU_MAU}`))
    .catch((e) => { console.error('Lỗi tạo dữ liệu mẫu:', e.message, e.chiTiet || ''); process.exitCode = 1; })
    .finally(() => db.destroy());
}
