// Lược đồ 19 bảng theo Bảng 3.6 của báo cáo (sau chuẩn hóa), kèm ràng buộc RB01-RB10 ở mức CSDL.
// Các ràng buộc liên quan hệ (RB11-RB20) được kiểm tra ở tầng dịch vụ.
const C = require('./lib/consts');

const BANG = [
  'NHATKY', 'THONGBAO', 'KETQUADANHGIA', 'PHIEUTHAMDINH', 'MINHCHUNG', 'BAOCAOSOLIEU', 'HOSODANHGIA', 'KYDANHGIA',
  'NGUOIDUNG', 'DONVI', 'VAITRO', 'MUCDOCHUYENDOISO', 'LOAIMINHCHUNG', 'BACDIEM', 'CHISO_LOAIDONVI', 'CHISO',
  'NHOMCHISO', 'LOAIDONVI', 'BOCHISO',
]; // thứ tự xóa: bảng con trước

const trong = (ds) => ds.map((x) => `'${x}'`).join(', ');

// Định nghĩa từng bảng: [tên bảng, hàm khai báo cột]. Thứ tự: bảng cha trước.
const DINH_NGHIA = [];
const dn = (ten, ham) => DINH_NGHIA.push([ten, ham]);

dn('BOCHISO', (t) => {
    t.increments('MaBo');
    t.string('TenBo', 200).notNullable();
    t.string('CanCuPhapLy', 500);
    t.date('NgayBanHanh');
    t.string('TrangThaiBo', 20).notNullable().defaultTo('NHAP');
    t.check(`TrangThaiBo IN (${trong(Object.values(C.TT_BO))})`); // RB03
});
dn('LOAIDONVI', (t) => {
    t.increments('MaLoaiDV');
    t.string('TenLoaiDV', 100).notNullable();
});
dn('NHOMCHISO', (t) => {
    t.increments('MaNhom');
    t.string('TenNhom', 200).notNullable();
    t.decimal('TrongSo', 5, 2).notNullable();
    t.integer('MaBo').unsigned().notNullable().references('MaBo').inTable('BOCHISO');
    t.check('TrongSo > 0 AND TrongSo <= 100');
});
dn('CHISO', (t) => {
    t.increments('MaChiSo');
    t.string('KyHieu', 20); // mã hiển thị, vd CS01
    t.string('TenChiSo', 300).notNullable();
    t.decimal('DiemToiDa', 6, 2).notNullable();
    t.string('KieuCongThuc', 20).notNullable();
    t.string('ChieuTot', 20).notNullable().defaultTo('CAO_TOT');
    t.decimal('ChiTieu', 18, 4);
    t.decimal('GiaTriMin', 18, 4).notNullable().defaultTo(0);
    t.decimal('GiaTriMax', 18, 4).notNullable();
    t.string('DonViTinh', 30);
    t.string('TanSuat', 10).notNullable();
    t.boolean('BatBuocMinhChung').notNullable().defaultTo(true);
    t.integer('MaNhom').unsigned().notNullable().references('MaNhom').inTable('NHOMCHISO');
    t.check(`KieuCongThuc IN (${trong(C.KIEU_CONG_THUC)})`); // RB01
    t.check(`ChieuTot IN (${trong(C.CHIEU_TOT)})`);
    t.check(`TanSuat IN (${trong(C.TAN_SUAT)})`);
    t.check('DiemToiDa > 0 AND GiaTriMin <= GiaTriMax'); // RB05
});
dn('CHISO_LOAIDONVI', (t) => {
    t.integer('MaChiSo').unsigned().notNullable().references('MaChiSo').inTable('CHISO');
    t.integer('MaLoaiDV').unsigned().notNullable().references('MaLoaiDV').inTable('LOAIDONVI');
    t.primary(['MaChiSo', 'MaLoaiDV']);
});
dn('BACDIEM', (t) => {
    t.increments('MaBac');
    t.decimal('TuGiaTri', 18, 4).notNullable();
    t.decimal('DenGiaTri', 18, 4); // rỗng = không giới hạn trên
    t.decimal('Diem', 6, 2).notNullable();
    t.integer('MaChiSo').unsigned().notNullable().references('MaChiSo').inTable('CHISO');
    t.check('DenGiaTri IS NULL OR TuGiaTri <= DenGiaTri'); // RB06
});
dn('LOAIMINHCHUNG', (t) => {
    t.increments('MaLoaiMC');
    t.string('TenLoaiMC', 200).notNullable();
});
dn('MUCDOCHUYENDOISO', (t) => {
    t.increments('MaMucDo');
    t.string('TenMucDo', 100).notNullable();
    t.decimal('DiemTu', 5, 2).notNullable();
    t.decimal('DiemDen', 5, 2).notNullable();
    t.integer('MaBo').unsigned().notNullable().references('MaBo').inTable('BOCHISO');
    t.check('DiemTu >= 0 AND DiemTu <= DiemDen AND DiemDen <= 100'); // RB06
});
dn('VAITRO', (t) => {
    t.string('MaVaiTro', 20).notNullable().primary();
    t.string('TenVaiTro', 100).notNullable();
    t.string('MoTa', 300);
});
dn('DONVI', (t) => {
    t.increments('MaDV');
    t.string('TenDV', 200).notNullable();
    t.string('Email', 100);
    t.integer('MaLoaiDV').unsigned().notNullable().references('MaLoaiDV').inTable('LOAIDONVI');
});
dn('NGUOIDUNG', (t) => {
    t.increments('MaND');
    t.string('HoTen', 100).notNullable();
    t.string('TenDangNhap', 50).notNullable().unique();
    t.string('MatKhau', 100).notNullable(); // băm bcrypt
    t.string('Email', 100);
    t.string('SDT', 20);
    t.string('TrangThaiTK', 20).notNullable().defaultTo('HOAT_DONG');
    t.string('MaVaiTro', 20).notNullable().references('MaVaiTro').inTable('VAITRO');
    t.integer('MaDV').unsigned().references('MaDV').inTable('DONVI');
    t.check(`TrangThaiTK IN (${trong(Object.values(C.TT_TK))})`);
});
dn('KYDANHGIA', (t) => {
    t.increments('MaKy');
    t.string('TenKy', 200).notNullable();
    t.string('LoaiKy', 10).notNullable();
    t.date('NgayBatDau').notNullable();
    t.date('NgayKetThuc').notNullable();
    t.date('HanNop').notNullable();
    t.string('TrangThaiKy', 20).notNullable().defaultTo('NHAP');
    t.date('NgayChot').notNullable(); // ngày chốt dự kiến; ghi lại ngày chốt thực tế khi chốt
    t.integer('MaBo').unsigned().notNullable().references('MaBo').inTable('BOCHISO');
    t.check(`LoaiKy IN (${trong(C.TAN_SUAT)})`); // RB01
    t.check(`TrangThaiKy IN (${trong(Object.values(C.TT_KY))})`); // RB03
    t.check('NgayBatDau < NgayKetThuc AND NgayKetThuc <= HanNop'); // RB04 (HanNop <= NgayChot kiểm tra ở dịch vụ vì NgayChot ghi lại khi chốt)
});
dn('HOSODANHGIA', (t) => {
    t.increments('MaHS');
    t.date('HanGiaHan');
    t.integer('MaKy').unsigned().notNullable().references('MaKy').inTable('KYDANHGIA');
    t.integer('MaDV').unsigned().notNullable().references('MaDV').inTable('DONVI');
    t.unique(['MaKy', 'MaDV']); // RB10
});
dn('BAOCAOSOLIEU', (t) => {
    t.increments('MaBC');
    t.decimal('GiaTri', 18, 4);
    t.string('TrangThaiBC', 20).notNullable().defaultTo('NHAP');
    t.datetime('NgayGui'); // ghi một lần ở lần gửi đầu (BR07)
    t.integer('MaHS').unsigned().notNullable().references('MaHS').inTable('HOSODANHGIA');
    t.integer('MaChiSo').unsigned().notNullable().references('MaChiSo').inTable('CHISO');
    t.integer('MaNguoiNhap').unsigned().notNullable().references('MaND').inTable('NGUOIDUNG');
    t.unique(['MaHS', 'MaChiSo']); // RB10
    t.check(`TrangThaiBC IN (${trong(Object.values(C.TT_BC))})`); // RB02
});
dn('MINHCHUNG', (t) => {
    t.increments('MaMC');
    t.string('TenTep', 255).notNullable();
    t.string('DuongDan', 255).notNullable();
    t.integer('DungLuong').notNullable();
    t.datetime('NgayTai').notNullable();
    t.string('TrangThaiMC', 20).notNullable().defaultTo('HIEU_LUC');
    t.integer('MaBC').unsigned().notNullable().references('MaBC').inTable('BAOCAOSOLIEU');
    t.integer('MaLoaiMC').unsigned().notNullable().references('MaLoaiMC').inTable('LOAIMINHCHUNG');
    t.check(`TrangThaiMC IN (${trong(Object.values(C.TT_MC))})`);
});
dn('PHIEUTHAMDINH', (t) => {
    t.increments('MaPhieuTD');
    t.integer('VongThamDinh').notNullable();
    t.string('KetLuan', 20).notNullable();
    t.string('NhanXet', 1000);
    t.datetime('NgayThamDinh').notNullable();
    t.integer('MaBC').unsigned().notNullable().references('MaBC').inTable('BAOCAOSOLIEU');
    t.integer('MaChuyenVien').unsigned().notNullable().references('MaND').inTable('NGUOIDUNG');
    t.unique(['MaBC', 'VongThamDinh']); // RB10
    t.check(`KetLuan IN (${trong(Object.values(C.KET_LUAN))})`); // RB02
    t.check(`KetLuan <> 'CHUA_DAT' OR (NhanXet IS NOT NULL AND NhanXet <> '')`); // RB07
});
dn('KETQUADANHGIA', (t) => {
    t.increments('MaKQ');
    t.decimal('TongDiem', 5, 2).notNullable();
    t.integer('HangTheoLoai').notNullable();
    t.integer('HangChung').notNullable();
    t.integer('MaHS').unsigned().notNullable().unique().references('MaHS').inTable('HOSODANHGIA'); // RB10, 1-1
    t.integer('MaMucDo').unsigned().references('MaMucDo').inTable('MUCDOCHUYENDOISO');
    t.check('TongDiem >= 0 AND TongDiem <= 100');
});
dn('THONGBAO', (t) => {
    t.increments('MaTB');
    t.string('LoaiTB', 30).notNullable();
    t.string('NoiDung', 500).notNullable();
    t.datetime('NgayGui').notNullable();
    t.boolean('DaDoc').notNullable().defaultTo(false);
    t.integer('MaND').unsigned().notNullable().references('MaND').inTable('NGUOIDUNG');
});
dn('NHATKY', (t) => {
    t.increments('MaNK');
    t.string('HanhDong', 50).notNullable();
    t.string('DoiTuong', 300).notNullable();
    t.datetime('ThoiGian').notNullable();
    t.integer('MaND').unsigned().notNullable().references('MaND').inTable('NGUOIDUNG');
});

async function taoBang(knex) {
  for (const [ten, ham] of DINH_NGHIA) await knex.schema.createTable(ten, ham);
}

// Nâng cấp CSDL tạo từ bản cũ: đổi tên thực thể theo báo cáo đã sửa
// (GIAODONVI -> HOSODANHGIA, khóa MaGiao -> MaHS; THAMDINH -> PHIEUTHAMDINH, khóa MaTD -> MaPhieuTD).
// Đổi tên tại chỗ nên giữ nguyên dữ liệu; khóa ngoại tự trỏ theo tên mới. Trả về số bước đã làm.
async function nangCap(knex) {
  let soBuoc = 0;
  if (await knex.schema.hasTable('GIAODONVI') && !(await knex.schema.hasTable('HOSODANHGIA'))) {
    await knex.schema.renameTable('GIAODONVI', 'HOSODANHGIA');
    await knex.schema.alterTable('HOSODANHGIA', (t) => t.renameColumn('MaGiao', 'MaHS'));
    await knex.schema.alterTable('BAOCAOSOLIEU', (t) => t.renameColumn('MaGiao', 'MaHS'));
    await knex.schema.alterTable('KETQUADANHGIA', (t) => t.renameColumn('MaGiao', 'MaHS'));
    soBuoc += 1;
  }
  if (await knex.schema.hasTable('THAMDINH') && !(await knex.schema.hasTable('PHIEUTHAMDINH'))) {
    await knex.schema.renameTable('THAMDINH', 'PHIEUTHAMDINH');
    await knex.schema.alterTable('PHIEUTHAMDINH', (t) => t.renameColumn('MaTD', 'MaPhieuTD'));
    soBuoc += 1;
  }
  return soBuoc;
}

async function xoaBang(knex) {
  // Xóa cả tên bảng cũ (GIAODONVI, THAMDINH) để reset được CSDL tạo từ bản trước
  const ds = [...BANG];
  ds.splice(ds.indexOf('PHIEUTHAMDINH') + 1, 0, 'THAMDINH');
  ds.splice(ds.indexOf('HOSODANHGIA') + 1, 0, 'GIAODONVI');
  for (const b of ds) await knex.schema.dropTableIfExists(b);
}

module.exports = { taoBang, xoaBang, nangCap, BANG, DINH_NGHIA };
