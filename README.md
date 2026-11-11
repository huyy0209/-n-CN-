# Hệ thống theo dõi chỉ số chuyển đổi số cấp sở/ngành/địa phương (IS028)

Đồ án chuyên ngành — Phạm Mạnh Trí Huy (2280601221), lớp 23DTHA6, HUTECH.

## Mô tả

Ứng dụng web đưa quy trình đánh giá chỉ số chuyển đổi số lên một hệ thống: cơ quan chủ trì khai báo bộ chỉ số và mở kỳ, đơn vị nhập số liệu kèm minh chứng, chuyên viên thẩm định, hệ thống tự tính điểm và xếp hạng khi chốt kỳ. Phần mềm cài đặt theo báo cáo phân tích thiết kế của đề tài: 19 bảng (Bảng 3.6), quy tắc nghiệp vụ BR01–BR25, ràng buộc RB01–RB20.

Bản này là **đợt 1 — luồng chính**. Các chức năng để đợt 2 ghi ở cuối tệp.

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Giao diện | React 18, React Router, Vite |
| API | Node.js, Express, JWT, Multer (tải tệp) |
| CSDL | SQL Server (qua Knex + tedious) |
| Test | `node --test`, chạy trên SQLite tạm |

## Các bước chạy

Cần Node.js 20 trở lên và SQL Server (bản Express hoặc Developer).

**1. Chuẩn bị SQL Server**

- Tạo CSDL trống: `CREATE DATABASE IS028;`
- Bật đăng nhập SQL Server (Mixed Mode) và có một tài khoản SQL, ví dụ `sa`.
- Bật TCP/IP trong SQL Server Configuration Manager, cổng 1433, rồi khởi động lại dịch vụ SQL Server.

**2. Chạy API**

```bash
cd server
npm install
copy .env.example .env      # Linux/macOS: cp .env.example .env
# mở .env, điền DB_USER, DB_PASSWORD, JWT_SECRET
npm run db:migrate          # tạo 19 bảng
npm run db:seed             # dữ liệu mẫu
npm start                   # http://localhost:4000
```

Dùng SQL Server Express có tên instance thì đặt `DB_INSTANCE=SQLEXPRESS` và bật dịch vụ SQL Server Browser.

**3. Chạy giao diện**

```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

Muốn chạy một cổng duy nhất: `npm run build` trong `client`, sau đó `npm start` trong `server` sẽ phục vụ luôn giao diện tại http://localhost:4000.

**Chạy thử không cần SQL Server:** đặt `DB_CLIENT=sqlite` trong `.env` rồi chạy các lệnh như trên (dữ liệu nằm trong tệp `server/is028.sqlite`).

### Lệnh khác

| Lệnh (trong `server`) | Tác dụng |
|---|---|
| `npm test` | Chạy 18 test logic tính điểm và luồng nghiệp vụ |
| `npm run db:reset` | Xóa hết bảng, tạo lại và nạp dữ liệu mẫu |
| `npm run db:sql` | Xuất script T-SQL tạo bảng ra `database/is028_sqlserver.sql` |

## Tài khoản mẫu

Mật khẩu chung: `123456`

| Tên đăng nhập | Vai trò | Đơn vị |
|---|---|---|
| `admin` | Quản trị hệ thống | Sở Khoa học và Công nghệ |
| `chutri` | Cán bộ cơ quan chủ trì | Sở Khoa học và Công nghệ |
| `lanhdao` | Lãnh đạo | Sở Khoa học và Công nghệ |
| `dm_skhcn`, `dm_syt`, `dm_snv` | Cán bộ đầu mối | Sở KH&CN, Sở Y tế, Sở Nội vụ |
| `dm_pa`, `dm_xb`, `dm_dkc` | Cán bộ đầu mối | UBND Phường A, Xã B, Đặc khu C |
| `td_skhcn`, `td_syt` | Chuyên viên thẩm định | Sở KH&CN, Sở Y tế |

## Dữ liệu mẫu

- Bộ chỉ số minh họa của Phụ lục B: 6 nhóm, 15 chỉ số CS01–CS15, đã ban hành.
- **Kỳ năm 2025** — đã chốt. UBND Xã B dùng đúng số liệu Bảng B.2 và ra **81,76 điểm** như báo cáo.
- **Kỳ quý 3 năm 2026** — đang mở, đã qua hạn nộp: dùng thử thẩm định và chốt kỳ.
- **Kỳ quý 4 năm 2026** — đang mở, còn hạn: dùng thử nhập số liệu, đính kèm, gửi, gia hạn.

Gợi ý trình diễn: `dm_xb` nhập và gửi một chỉ số ở kỳ quý 4 → `td_skhcn` kết luận Chưa đạt kèm nhận xét → `dm_xb` xem thông báo, bổ sung, gửi lại → `td_skhcn` kết luận Đạt → `chutri` chốt kỳ quý 3 và xem xếp hạng.

## Cấu trúc thư mục

```
server/
  src/
    schema.js          19 bảng và ràng buộc mức CSDL
    seed.js            dữ liệu mẫu (tạo qua chính các hàm dịch vụ)
    lib/scoring.js     công thức tính điểm, xếp hạng, mức độ (hàm thuần)
    lib/dates.js       xử lý hạn đến 23:59:59 giờ Việt Nam
    services/          nghiệp vụ: bochiso.js, ky.js, baocao.js
    routes/            API: hethong.js, danhmuc.js, nghiepvu.js
    middleware/auth.js xác thực JWT, phân quyền theo vai trò
  test/                test tính điểm và luồng nghiệp vụ
client/
  src/pages/           màn hình theo vai trò
database/
  is028_sqlserver.sql  script T-SQL tạo bảng (sinh tự động)
```

## Đối chiếu Use Case

| Use Case | Trạng thái | Nơi cài đặt |
|---|---|---|
| 1.1 Quản lý tài khoản và phân quyền | Có | `routes/hethong.js`, `pages/QuanTri.jsx` |
| 1.2 Nhập tài khoản bằng Excel | Đợt 2 | |
| 1.3 Xem nhật ký | Có | `routes/hethong.js` |
| 1.4 Quản lý đơn vị | Có | `routes/danhmuc.js` |
| 1.5 Quản lý bộ chỉ số | Có | `services/bochiso.js`, `pages/BoChiSo.jsx` |
| 1.6 Quản lý loại minh chứng | Có | `routes/danhmuc.js` |
| 2.1 Mở kỳ, 2.2 Giao đơn vị | Có | `services/ky.js`, `pages/Ky.jsx` |
| 2.3 Gia hạn | Có | `services/ky.js` → `giaHan` |
| 2.4 Chốt kỳ | Có | `services/ky.js` → `chotKy` |
| 3.1 Nhập số liệu, 3.2 Đính kèm minh chứng | Có | `services/baocao.js`, `pages/BaoCao.jsx` |
| 3.3 Gửi báo cáo, 3.4 Bổ sung | Có | `services/baocao.js` → `guiBaoCao` |
| 4.1 – 4.4 Thẩm định | Có | `services/baocao.js`, `pages/ThamDinh.jsx` |
| 5.1 Theo dõi tiến độ và chậm hạn | Có | `services/ky.js` → `tienDo` |
| 5.2 So sánh các kỳ | Đợt 2 | |
| 5.3 Dashboard và xuất báo cáo | Một phần: có bảng xếp hạng theo loại và bảng tổng hợp chung; biểu đồ và xuất tệp để đợt 2 | `pages/KetQua.jsx` |
| Thông báo trong ứng dụng (BR15) | Có, gồm nhắc sắp tới hạn và quá hạn | `services/common.js`, `services/ky.js` → `nhacHan` |

## Điểm khác so với báo cáo

- Trạng thái và kiểu công thức lưu bằng mã không dấu (`NHAP`, `CHO_THAM_DINH`, `TY_LE`…), nhãn tiếng Việt hiển thị ở giao diện. Miền giá trị vẫn đúng RB01–RB03.
- Bảng `CHISO` thêm hai cột `KyHieu` (CS01…) và `DonViTinh` để hiển thị.
- `VAITRO.MaVaiTro` là mã chữ (`CHU_TRI`, `DAU_MOI`…).
- `KYDANHGIA.NgayChot` lưu ngày chốt dự kiến khi tạo kỳ, được ghi lại thành ngày chốt thực tế khi chốt.
- Báo cáo chỉ nêu công thức tỷ lệ cho chiều cao tốt. Với chiều thấp tốt, phần mềm tính: giá trị ≤ chỉ tiêu thì đủ điểm, lớn hơn thì điểm = chỉ tiêu ÷ giá trị × điểm tối đa.
- Tên năm mức độ (Yếu, Trung bình, Khá, Tốt, Xuất sắc) và ngưỡng là giá trị minh họa, sửa được khi tạo bộ chỉ số mới.
- Bậc điểm tính theo khoảng đóng hai đầu; mức độ tính điểm bằng biên dưới thuộc mức trên.

## Lưu ý

- Luồng nghiệp vụ đã được test tự động và chạy thử giao diện trên SQLite. Phần chạy với SQL Server chưa được chạy thử trong môi trường phát triển của đợt này; nếu gặp lỗi khi `db:migrate` hoặc `db:seed`, hãy gửi lại thông báo lỗi.
- Tài khoản mẫu dùng mật khẩu yếu, chỉ để trình diễn. Đổi `JWT_SECRET` và mật khẩu trước khi dùng thật.
- Tệp minh chứng lưu ở `server/uploads/`, giới hạn 10 MB mỗi tệp (đổi bằng `MAX_FILE_MB`).

## Đợt 2 (chưa làm)

- UC 1.2 Nhập tài khoản bằng Excel
- UC 5.2 So sánh các kỳ
- UC 5.3 Dashboard có biểu đồ, xuất báo cáo ra tệp
