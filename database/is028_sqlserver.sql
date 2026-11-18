-- Script tạo 19 bảng cho SQL Server - sinh tự động từ server/src/schema.js, không sửa tay.
-- Dùng để đưa vào báo cáo hoặc chạy tay trong SSMS thay cho "npm run db:migrate".

-- BOCHISO
CREATE TABLE [BOCHISO] ([MaBo] int identity(1,1) not null primary key, [TenBo] nvarchar(200) not null, [CanCuPhapLy] nvarchar(500), [NgayBanHanh] date, [TrangThaiBo] nvarchar(20) not null CONSTRAINT [bochiso_trangthaibo_default] DEFAULT 'NHAP', check (TrangThaiBo IN ('NHAP', 'BAN_HANH', 'HET_HIEU_LUC')));

-- LOAIDONVI
CREATE TABLE [LOAIDONVI] ([MaLoaiDV] int identity(1,1) not null primary key, [TenLoaiDV] nvarchar(100) not null);

-- NHOMCHISO
CREATE TABLE [NHOMCHISO] ([MaNhom] int identity(1,1) not null primary key, [TenNhom] nvarchar(200) not null, [TrongSo] decimal(5, 2) not null, [MaBo] int not null, CONSTRAINT [nhomchiso_mabo_foreign] FOREIGN KEY ([MaBo]) REFERENCES [BOCHISO] ([MaBo]), check (TrongSo > 0 AND TrongSo <= 100));

-- CHISO
CREATE TABLE [CHISO] ([MaChiSo] int identity(1,1) not null primary key, [KyHieu] nvarchar(20), [TenChiSo] nvarchar(300) not null, [DiemToiDa] decimal(6, 2) not null, [KieuCongThuc] nvarchar(20) not null, [ChieuTot] nvarchar(20) not null CONSTRAINT [chiso_chieutot_default] DEFAULT 'CAO_TOT', [ChiTieu] decimal(18, 4), [GiaTriMin] decimal(18, 4) not null CONSTRAINT [chiso_giatrimin_default] DEFAULT '0', [GiaTriMax] decimal(18, 4) not null, [DonViTinh] nvarchar(30), [TanSuat] nvarchar(10) not null, [BatBuocMinhChung] bit not null CONSTRAINT [chiso_batbuocminhchung_default] DEFAULT '1', [MaNhom] int not null, CONSTRAINT [chiso_manhom_foreign] FOREIGN KEY ([MaNhom]) REFERENCES [NHOMCHISO] ([MaNhom]), check (KieuCongThuc IN ('CO_KHONG', 'TY_LE', 'BAC_THANG')), check (ChieuTot IN ('CAO_TOT', 'THAP_TOT')), check (TanSuat IN ('QUY', 'NAM')), check (DiemToiDa > 0 AND GiaTriMin <= GiaTriMax));

-- CHISO_LOAIDONVI
CREATE TABLE [CHISO_LOAIDONVI] ([MaChiSo] int not null, [MaLoaiDV] int not null, CONSTRAINT [chiso_loaidonvi_machiso_foreign] FOREIGN KEY ([MaChiSo]) REFERENCES [CHISO] ([MaChiSo]), CONSTRAINT [chiso_loaidonvi_maloaidv_foreign] FOREIGN KEY ([MaLoaiDV]) REFERENCES [LOAIDONVI] ([MaLoaiDV]), CONSTRAINT [CHISO_LOAIDONVI_pkey] PRIMARY KEY ([MaChiSo], [MaLoaiDV]));

-- BACDIEM
CREATE TABLE [BACDIEM] ([MaBac] int identity(1,1) not null primary key, [TuGiaTri] decimal(18, 4) not null, [DenGiaTri] decimal(18, 4), [Diem] decimal(6, 2) not null, [MaChiSo] int not null, CONSTRAINT [bacdiem_machiso_foreign] FOREIGN KEY ([MaChiSo]) REFERENCES [CHISO] ([MaChiSo]), check (DenGiaTri IS NULL OR TuGiaTri <= DenGiaTri));

-- LOAIMINHCHUNG
CREATE TABLE [LOAIMINHCHUNG] ([MaLoaiMC] int identity(1,1) not null primary key, [TenLoaiMC] nvarchar(200) not null);

-- MUCDOCHUYENDOISO
CREATE TABLE [MUCDOCHUYENDOISO] ([MaMucDo] int identity(1,1) not null primary key, [TenMucDo] nvarchar(100) not null, [DiemTu] decimal(5, 2) not null, [DiemDen] decimal(5, 2) not null, [MaBo] int not null, CONSTRAINT [mucdochuyendoiso_mabo_foreign] FOREIGN KEY ([MaBo]) REFERENCES [BOCHISO] ([MaBo]), check (DiemTu >= 0 AND DiemTu <= DiemDen AND DiemDen <= 100));

-- VAITRO
CREATE TABLE [VAITRO] ([MaVaiTro] nvarchar(20) not null, [TenVaiTro] nvarchar(100) not null, [MoTa] nvarchar(300), CONSTRAINT [VAITRO_pkey] PRIMARY KEY ([MaVaiTro]));

-- DONVI
CREATE TABLE [DONVI] ([MaDV] int identity(1,1) not null primary key, [TenDV] nvarchar(200) not null, [Email] nvarchar(100), [MaLoaiDV] int not null, CONSTRAINT [donvi_maloaidv_foreign] FOREIGN KEY ([MaLoaiDV]) REFERENCES [LOAIDONVI] ([MaLoaiDV]));

-- NGUOIDUNG
CREATE TABLE [NGUOIDUNG] ([MaND] int identity(1,1) not null primary key, [HoTen] nvarchar(100) not null, [TenDangNhap] nvarchar(50) not null, [MatKhau] nvarchar(100) not null, [Email] nvarchar(100), [SDT] nvarchar(20), [TrangThaiTK] nvarchar(20) not null CONSTRAINT [nguoidung_trangthaitk_default] DEFAULT 'HOAT_DONG', [MaVaiTro] nvarchar(20) not null, [MaDV] int, CONSTRAINT [nguoidung_mavaitro_foreign] FOREIGN KEY ([MaVaiTro]) REFERENCES [VAITRO] ([MaVaiTro]), CONSTRAINT [nguoidung_madv_foreign] FOREIGN KEY ([MaDV]) REFERENCES [DONVI] ([MaDV]), check (TrangThaiTK IN ('HOAT_DONG', 'KHOA')));
CREATE UNIQUE INDEX [nguoidung_tendangnhap_unique] ON [NGUOIDUNG] ([TenDangNhap]) WHERE [TenDangNhap] IS NOT NULL;

-- KYDANHGIA
CREATE TABLE [KYDANHGIA] ([MaKy] int identity(1,1) not null primary key, [TenKy] nvarchar(200) not null, [LoaiKy] nvarchar(10) not null, [NgayBatDau] date not null, [NgayKetThuc] date not null, [HanNop] date not null, [TrangThaiKy] nvarchar(20) not null CONSTRAINT [kydanhgia_trangthaiky_default] DEFAULT 'NHAP', [NgayChot] date not null, [MaBo] int not null, CONSTRAINT [kydanhgia_mabo_foreign] FOREIGN KEY ([MaBo]) REFERENCES [BOCHISO] ([MaBo]), check (LoaiKy IN ('QUY', 'NAM')), check (TrangThaiKy IN ('NHAP', 'DANG_MO', 'DA_CHOT')), check (NgayBatDau < NgayKetThuc AND NgayKetThuc <= HanNop));

-- HOSODANHGIA
CREATE TABLE [HOSODANHGIA] ([MaHS] int identity(1,1) not null primary key, [HanGiaHan] date, [MaKy] int not null, [MaDV] int not null, CONSTRAINT [hosodanhgia_maky_foreign] FOREIGN KEY ([MaKy]) REFERENCES [KYDANHGIA] ([MaKy]), CONSTRAINT [hosodanhgia_madv_foreign] FOREIGN KEY ([MaDV]) REFERENCES [DONVI] ([MaDV]));
CREATE UNIQUE INDEX [hosodanhgia_maky_madv_unique] ON [HOSODANHGIA] ([MaKy], [MaDV]) WHERE [MaKy] IS NOT NULL AND [MaDV] IS NOT NULL;

-- BAOCAOSOLIEU
CREATE TABLE [BAOCAOSOLIEU] ([MaBC] int identity(1,1) not null primary key, [GiaTri] decimal(18, 4), [TrangThaiBC] nvarchar(20) not null CONSTRAINT [baocaosolieu_trangthaibc_default] DEFAULT 'NHAP', [NgayGui] datetime2, [MaHS] int not null, [MaChiSo] int not null, [MaNguoiNhap] int not null, CONSTRAINT [baocaosolieu_mahs_foreign] FOREIGN KEY ([MaHS]) REFERENCES [HOSODANHGIA] ([MaHS]), CONSTRAINT [baocaosolieu_machiso_foreign] FOREIGN KEY ([MaChiSo]) REFERENCES [CHISO] ([MaChiSo]), CONSTRAINT [baocaosolieu_manguoinhap_foreign] FOREIGN KEY ([MaNguoiNhap]) REFERENCES [NGUOIDUNG] ([MaND]), check (TrangThaiBC IN ('NHAP', 'CHO_THAM_DINH', 'CAN_BO_SUNG', 'DAT')));
CREATE UNIQUE INDEX [baocaosolieu_mahs_machiso_unique] ON [BAOCAOSOLIEU] ([MaHS], [MaChiSo]) WHERE [MaHS] IS NOT NULL AND [MaChiSo] IS NOT NULL;

-- MINHCHUNG
CREATE TABLE [MINHCHUNG] ([MaMC] int identity(1,1) not null primary key, [TenTep] nvarchar(255) not null, [DuongDan] nvarchar(255) not null, [DungLuong] int not null, [NgayTai] datetime2 not null, [TrangThaiMC] nvarchar(20) not null CONSTRAINT [minhchung_trangthaimc_default] DEFAULT 'HIEU_LUC', [MaBC] int not null, [MaLoaiMC] int not null, CONSTRAINT [minhchung_mabc_foreign] FOREIGN KEY ([MaBC]) REFERENCES [BAOCAOSOLIEU] ([MaBC]), CONSTRAINT [minhchung_maloaimc_foreign] FOREIGN KEY ([MaLoaiMC]) REFERENCES [LOAIMINHCHUNG] ([MaLoaiMC]), check (TrangThaiMC IN ('HIEU_LUC', 'DA_THAY_THE')));

-- PHIEUTHAMDINH
CREATE TABLE [PHIEUTHAMDINH] ([MaPhieuTD] int identity(1,1) not null primary key, [VongThamDinh] int not null, [KetLuan] nvarchar(20) not null, [NhanXet] nvarchar(1000), [NgayThamDinh] datetime2 not null, [MaBC] int not null, [MaChuyenVien] int not null, CONSTRAINT [phieuthamdinh_mabc_foreign] FOREIGN KEY ([MaBC]) REFERENCES [BAOCAOSOLIEU] ([MaBC]), CONSTRAINT [phieuthamdinh_machuyenvien_foreign] FOREIGN KEY ([MaChuyenVien]) REFERENCES [NGUOIDUNG] ([MaND]), check (KetLuan IN ('DAT', 'CHUA_DAT')), check (KetLuan <> 'CHUA_DAT' OR (NhanXet IS NOT NULL AND NhanXet <> '')));
CREATE UNIQUE INDEX [phieuthamdinh_mabc_vongthamdinh_unique] ON [PHIEUTHAMDINH] ([MaBC], [VongThamDinh]) WHERE [MaBC] IS NOT NULL AND [VongThamDinh] IS NOT NULL;

-- KETQUADANHGIA
CREATE TABLE [KETQUADANHGIA] ([MaKQ] int identity(1,1) not null primary key, [TongDiem] decimal(5, 2) not null, [HangTheoLoai] int not null, [HangChung] int not null, [MaHS] int not null, [MaMucDo] int, CONSTRAINT [ketquadanhgia_mahs_foreign] FOREIGN KEY ([MaHS]) REFERENCES [HOSODANHGIA] ([MaHS]), CONSTRAINT [ketquadanhgia_mamucdo_foreign] FOREIGN KEY ([MaMucDo]) REFERENCES [MUCDOCHUYENDOISO] ([MaMucDo]), check (TongDiem >= 0 AND TongDiem <= 100));
CREATE UNIQUE INDEX [ketquadanhgia_mahs_unique] ON [KETQUADANHGIA] ([MaHS]) WHERE [MaHS] IS NOT NULL;

-- THONGBAO
CREATE TABLE [THONGBAO] ([MaTB] int identity(1,1) not null primary key, [LoaiTB] nvarchar(30) not null, [NoiDung] nvarchar(500) not null, [NgayGui] datetime2 not null, [DaDoc] bit not null CONSTRAINT [thongbao_dadoc_default] DEFAULT '0', [MaND] int not null, CONSTRAINT [thongbao_mand_foreign] FOREIGN KEY ([MaND]) REFERENCES [NGUOIDUNG] ([MaND]));

-- NHATKY
CREATE TABLE [NHATKY] ([MaNK] int identity(1,1) not null primary key, [HanhDong] nvarchar(50) not null, [DoiTuong] nvarchar(300) not null, [ThoiGian] datetime2 not null, [MaND] int not null, CONSTRAINT [nhatky_mand_foreign] FOREIGN KEY ([MaND]) REFERENCES [NGUOIDUNG] ([MaND]));
