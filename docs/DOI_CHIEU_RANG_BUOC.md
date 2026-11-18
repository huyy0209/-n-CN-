# Đối chiếu ràng buộc toàn vẹn RB01–RB20 với mã nguồn

Bảng này chỉ ra từng ràng buộc trong báo cáo được cài ở đâu và được test nào kiểm tra, để khi bảo vệ có thể mở đúng chỗ trong code. Đường dẫn tính từ `server/src/`. Trong code, mỗi chỗ cài đặt đều có chú thích mã RB tương ứng, tìm nhanh bằng cách tìm chuỗi `RBxx`.

Ràng buộc được kiểm tra ở hai tầng:

- **Tầng CSDL** (`schema.js`): `CHECK`, `UNIQUE`, khóa ngoại. Dữ liệu sai bị chặn kể cả khi ghi thẳng vào CSDL, không qua API.
- **Tầng dịch vụ** (`services/`, `routes/`): các ràng buộc liên bộ và liên quan hệ, cần đọc nhiều bảng nên CSDL không tự kiểm tra được.

## Miền giá trị

| Mã | Nội dung | Tầng CSDL | Tầng dịch vụ | Test |
|---|---|---|---|---|
| RB01 | KieuCongThuc, ChieuTot, TanSuat, LoaiKy thuộc miền cho phép | `CHECK` ở bảng `CHISO`, `KYDANHGIA` | `routes/danhmuc.js` → `kiemTraChiSo` | Giao diện chỉ cho chọn giá trị hợp lệ |
| RB02 | TrangThaiBC; KetLuan ∈ {Đạt, Chưa đạt} | `CHECK` ở bảng `BAOCAOSOLIEU`, `PHIEUTHAMDINH` | `services/baocao.js` → `ketLuan` | `flow.test.js`: vòng thẩm định |
| RB03 | TrangThaiBo, TrangThaiKy thuộc miền cho phép | `CHECK` ở bảng `BOCHISO`, `KYDANHGIA` | Chuyển trạng thái qua `banHanh`, `moKy`, `chotKy` | `flow.test.js`: bộ đã ban hành bị khóa |

## Liên thuộc tính

| Mã | Nội dung | Tầng CSDL | Tầng dịch vụ | Test |
|---|---|---|---|---|
| RB04 | NgayBatDau < NgayKetThuc ≤ HanNop ≤ NgayChot | `CHECK` ở bảng `KYDANHGIA` (3 mốc đầu) | `services/ky.js` → `kiemTraMocNgay` (đủ 4 mốc) | `flow.test.js`: mốc ngày sai thứ tự bị chặn |
| RB05 | DiemToiDa > 0; GiaTriMin ≤ ChiTieu ≤ GiaTriMax | `CHECK` ở bảng `CHISO` | `routes/danhmuc.js` → `kiemTraChiSo`; `services/bochiso.js` → `kiemTraBanHanh` | Kiểm tra khi lưu chỉ số và khi ban hành bộ |
| RB06 | TuGiaTri ≤ DenGiaTri; 0 ≤ DiemTu ≤ DiemDen ≤ 100 | `CHECK` ở bảng `BACDIEM`, `MUCDOCHUYENDOISO` | `routes/danhmuc.js` → `kiemTraChiSo`, `PUT /bochiso/:id/mucdo` | Kiểm tra khi lưu |
| RB07 | KetLuan = Chưa đạt thì bắt buộc NhanXet | `CHECK` ở bảng `PHIEUTHAMDINH` | `services/baocao.js` → `ketLuan` | `flow.test.js`: Chưa đạt cần nhận xét |

## Liên bộ

| Mã | Nội dung | Tầng CSDL | Tầng dịch vụ | Test |
|---|---|---|---|---|
| RB08 | Tổng trọng số các nhóm cùng bộ = 100 | — | `services/bochiso.js` → `kiemTraBanHanh` | Chặn ban hành bộ |
| RB09 | Bậc điểm không chồng khoảng; mức độ không chồng, phủ 0–100 | — | `services/bochiso.js` → `kiemTraBanHanh` | Chặn ban hành bộ |
| RB10 | Duy nhất: HOSODANHGIA (MaKy, MaDV); BAOCAOSOLIEU (MaHS, MaChiSo); PHIEUTHAMDINH (MaBC, VongThamDinh); KETQUADANHGIA (MaHS) | `UNIQUE` ở 4 bảng | — | Vi phạm thì CSDL báo lỗi |

## Liên quan hệ

| Mã | Nội dung | Tầng dịch vụ | Test |
|---|---|---|---|
| RB11 | Chỉ số trong báo cáo thuộc bộ của kỳ, TanSuat = LoaiKy, áp dụng cho loại đơn vị | `services/ky.js` → `chiSoApDung`; `services/baocao.js` → `luuNhap` | `flow.test.js`: chỉ số không áp dụng bị chặn |
| RB12 | MaMucDo của kết quả cùng bộ với kỳ | `services/ky.js` → `chotKy` (chỉ lấy mức độ của bộ của kỳ) | `flow.test.js`: chốt kỳ quý 3 |
| RB13 | Kỳ chỉ mở khi bộ Ban hành; bộ đã ban hành thì khóa | `services/ky.js` → `taoKy`, `moKy`; `services/bochiso.js` → `yeuCauNhap` | `flow.test.js`: bộ đã ban hành bị khóa |
| RB14 | Người thẩm định là chuyên viên thẩm định, khác đơn vị được đánh giá | `services/baocao.js` → `yeuCauKhacDonVi`, `danhSachCho` (lọc báo cáo của đơn vị mình); `routes/hethong.js` → `kiemTraTaiKhoan` | `flow.test.js`: không tự thẩm định |
| RB15 | Người nhập là cán bộ đầu mối của chính đơn vị | `services/baocao.js` → `yeuCauDonViMinh`; `routes/hethong.js` → `kiemTraTaiKhoan` | `flow.test.js`: đầu mối chỉ sửa dữ liệu đơn vị mình |
| RB16 | Chỉ số bắt buộc minh chứng phải có ít nhất 1 tệp còn hiệu lực mới được gửi | `services/baocao.js` → `guiBaoCao` | `flow.test.js`: thiếu minh chứng bắt buộc bị chặn |
| RB17 | TrangThaiBC = Đạt khi và chỉ khi vòng thẩm định cuối kết luận Đạt | `services/baocao.js` → `ketLuan` | `flow.test.js`: vòng 1 Chưa đạt, vòng 2 Đạt |
| RB18 | NgayGui ghi một lần; HanNop < HanGiaHan ≤ NgayChot; chưa quá hạn hiện hành mới gia hạn | `services/ky.js` → `giaHan`; `services/baocao.js` → `guiBaoCao` | `flow.test.js`: gia hạn; gửi lại không ghi đè NgayGui |
| RB19 | Kỳ Đã chốt thì khóa báo cáo, minh chứng, phiếu thẩm định | `services/baocao.js` → `yeuCauKyMo`; `services/ky.js` → `giaoDonVi` | `flow.test.js`: kỳ đã chốt bị khóa |
| RB20 | KETQUADANHGIA chỉ tạo khi chốt kỳ, không sửa được | `services/ky.js` → `chotKy` (một giao dịch, không có API sửa kết quả) | `flow.test.js`: không chốt lại được |

## Tên bảng theo báo cáo đã sửa

Theo góp ý của giảng viên, thực thể được đặt tên bằng danh từ:

| Tên cũ | Tên mới | Khóa chính cũ | Khóa chính mới |
|---|---|---|---|
| GIAODONVI | HOSODANHGIA (hồ sơ đánh giá của một đơn vị trong một kỳ) | MaGiao | MaHS |
| THAMDINH | PHIEUTHAMDINH (phiếu thẩm định một vòng) | MaTD | MaPhieuTD |

Khóa ngoại `MaGiao` trong `BAOCAOSOLIEU` và `KETQUADANHGIA` đổi theo thành `MaHS`. Use Case vẫn giữ tên hành động ("Giao đơn vị vào kỳ", "Thẩm định") vì đó là động từ của chức năng, không phải tên thực thể.

CSDL tạo từ bản cũ được nâng cấp tự động khi chạy `start.bat` hoặc `npm run db:migrate`: đổi tên bảng và cột tại chỗ, giữ nguyên dữ liệu (`schema.js` → `nangCap`, test ở `test/nangcap.test.js`).
