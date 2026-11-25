# Báo cáo kiểm thử giao diện end-to-end — IS028

- Người thực hiện: Claude (worker Orca, task `task_3438b72aca0e`)
- Ngày chạy: 25/11/2026
- Kịch bản: `HUONG_DAN_DEMO.md` (mục 0 → 11, gồm 9b) và một số ca ngoài kịch bản
- Ảnh chụp: `test-reports/ui-screenshots/` (61 ảnh, tên ảnh bắt đầu bằng số bước)

## 1. Môi trường và cách chạy

| Hạng mục | Giá trị |
|---|---|
| Node | v26 (better-sqlite3 13.2.0) |
| CSDL | SQLite, `server/.env` với `DB_CLIENT=sqlite`, `SQLITE_FILE=./is028.sqlite` (tệp tạo mới, nằm trong `.gitignore`) |
| Dữ liệu | `npm run db:reset` ngay trước khi chạy: "Đã tạo 19 bảng. Đã tạo dữ liệu mẫu." |
| API | `node src/index.js` tại cổng 4000 |
| Giao diện | `npx vite --host 127.0.0.1` (Vite 5.4.21) tại cổng 5173; `npm install` cho client; chạy tay `node node_modules/esbuild/install.js` vì npm chặn postinstall của esbuild (không sửa `package.json`) |
| Trình duyệt | Trình duyệt nhúng của Orca, điều khiển bằng `orca goto/snapshot/fill/click/select/upload/eval/screenshot`; lỗi console đọc bằng `orca exec --command errors` / `console` |
| Kết thúc | Đã dừng cả hai tiến trình 4000 và 5173 và đóng tab trình duyệt |

Ghi chú về cách chạy:

- Kịch bản dùng "cửa sổ ẩn danh" để đổi vai. Ở đây dùng một tab và đổi tài khoản bằng cách xóa `localStorage.is028_token` rồi đăng nhập lại qua form. Luồng nghiệp vụ không đổi.
- Các hộp thoại gốc của trình duyệt (`window.prompt`/`confirm`) ở trang Bộ chỉ số, Kỳ, Đơn vị, Loại minh chứng bị Orca tự đóng khi lệnh kế tiếp chạy. Vì vậy trước mỗi thao tác có hộp thoại, test thay `prompt`/`confirm` bằng hàng đợi câu trả lời định sẵn và ghi lại nội dung hộp thoại để đối chiếu. Mã ứng dụng vẫn chạy như khi người dùng bấm OK.
- Ô nhập được gán giá trị theo cách React nhận được (native value setter + sự kiện `input`/`change`). Tải tệp dùng `orca upload` vào đúng ô file của form.

## 2. Tổng kết

| Nhóm | Số ca | Đạt | Lỗi |
|---|---|---|---|
| Kịch bản HUONG_DAN_DEMO (mục 1–11, 9b) | 62 bước | 62 | 0 lỗi chặn; 4 lỗi nhỏ quan sát được trong lúc chạy |
| Ngoài kịch bản | 14 ca | 12 | 2 (1 trung bình, 1 thấp) |
| **Tổng** | **76** | **74 đạt hoàn toàn** | **7 lỗi** (0 nghiêm trọng, 1 trung bình, 6 thấp) |

Mọi "Kết quả" mong đợi trong HUONG_DAN_DEMO đều khớp, kể cả các con số: 99,17 / 33,75 / 30 / 100 / 20 / 12,5 (kỳ quý 3), 81,76 và bảng nhóm 18÷20, 20,5÷25, 9,2÷15, 5÷5, 16÷20 (kỳ năm 2025), dashboard 76,21 / 98,05 / 42,3, so sánh 63,07 → 81,76 ▲ +18,69. Console trình duyệt không có lỗi (`errors: []`) suốt phiên. API phản hồi trong 5–48 ms, chốt kỳ dưới 1 giây. Không có trang trắng.

## 3. Kết quả từng bước theo kịch bản

| Bước | Tài khoản | Kết quả thực tế | KQ | Ảnh |
|---|---|---|---|---|
| 1.1 | chutri | Bộ "Phụ lục B": nhãn Ban hành, dòng "Bộ đã khóa…", chỉ có nút Sao chép / Ngừng hiệu lực, không có nút sửa nhóm hay chỉ số | Đạt | 01-1 |
| 1.2 | chutri | CS01 Có/không, CS04 Tỷ lệ "Chỉ tiêu 100%", CS02 Bậc thang; CS10 ghi "(thấp tốt)" | Đạt | 01-1 |
| 1.3 | chutri | CS09 chỉ áp dụng cho sở; CS13, CS14 chỉ cho xã; CS08, 10, 11, 12 tần suất Quý | Đạt | 01-1 |
| 1.4 | chutri | Prompt gợi ý "… (bản sao)"; mở bộ mới `/bo-chi-so/2` trạng thái Nháp, 6 nhóm, 15 chỉ số, 5 mức | Đạt | 01-4 |
| 1.5 | chutri | Sửa nhóm thành 20 → "Tổng trọng số: 110%"; bấm Ban hành bị chặn: "Tổng trọng số các nhóm phải bằng 100 (hiện là 110). (RB08)" | Đạt | 01-5 |
| 1.6 | chutri | Xóa bộ → về danh sách, còn 1 bộ | Đạt | — |
| 2.1 | chutri | Bị chặn: "Bốn mốc ngày phải theo thứ tự … (RB04)" | Đạt | 02-1 |
| 2.2 | chutri | Hạn nộp 15/01/2027 → `/ky/6` trạng thái Nháp | Đạt | — |
| 2.3 | chutri | "Kỳ cần ít nhất một lượt giao đơn vị mới được mở. (BR17)" | Đạt | 02-3 |
| 2.4 | chutri | 6 đơn vị đã tick sẵn → 6 dòng, mỗi dòng 9 chỉ số (sở: CS01–07, 09, 15; xã: CS01–07, 13, 14) | Đạt (xem lỗi UI-04) | 02-4, 02-4a |
| 2.5 | chutri | Trạng thái Đang mở | Đạt | — |
| 3.1 | dm_xb | Có thông báo "Kỳ "Kỳ năm 2026" đã mở. Hạn nộp báo cáo: 15/01/2027." | Đạt (xem lỗi UI-05) | 03-1 |
| 3.2 | dm_xb | Chỉ thấy các kỳ của UBND Xã B | Đạt | 03-2 |
| 3.3 | dm_xb | Kỳ quý 4: CS08 (Nháp, 70%), CS10, CS11, CS12 | Đạt | — |
| 3.4 | dm_xb | Lưu nháp 150 được, cảnh báo vàng "Giá trị nằm ngoài miền hợp lệ (0 đến 100)…" | Đạt | 03-4 |
| 3.5 | dm_xb | Bị chặn với 2 lỗi: ngoài miền; thiếu minh chứng (RB16) | Đạt | 03-5 |
| 3.6 | dm_xb | Sửa 64, chọn loại, tải PDF → bảng có tệp, "Còn hiệu lực"; giá trị 64 vẫn giữ sau khi tải | Đạt | 03-6 |
| 3.7 | dm_xb | Hộp thoại đóng, CS11 "Chờ thẩm định" | Đạt | 03-7 |
| 3.8 | dm_xb | Nút "Xem"; ô giá trị `disabled`; chỉ còn nút tải tệp và Đóng | Đạt | 03-8 |
| 4.1 | td_syt | Danh sách không có báo cáo của Sở Y tế (6 dòng) | Đạt | 04-1 |
| 4.2 | td_skhcn | Thêm 2 dòng Sở Y tế CS11, CS12 kỳ quý 3 (8 dòng) | Đạt | 04-2 |
| 4.3 | td_skhcn | Trang chi tiết: 64%, chỉ tiêu 80, tệp tải về được (blob 399 B, application/pdf) | Đạt | 04-3 |
| 4.4 | td_skhcn | "Kết luận Chưa đạt bắt buộc có nhận xét." | Đạt | 04-4 |
| 4.5 | td_skhcn | Về danh sách chờ, dòng kỳ quý 4 biến mất | Đạt | 04-5 |
| 5.1 | dm_xb | Thông báo "…chỉ số CS11 cần bổ sung. Nhận xét: Thiếu bảng thống kê hồ sơ tháng 12" | Đạt | 05-1 |
| 5.2 | dm_xb | Trạng thái Cần bổ sung, khung nhận xét vòng 1, bảng Lịch sử thẩm định vòng 1 | Đạt | 05-2 |
| 5.3 | dm_xb | Tệp cũ "Đã thay thế", vẫn trong bảng, vẫn tải được (blob PDF) | Đạt | 05-3 |
| 5.4 | dm_xb | Tải PDF thứ hai (M02), giá trị 66 → Gửi lại → Chờ thẩm định | Đạt | 05-4 |
| 5.5 | td_skhcn | "Gửi lại (vòng 2)"; Gửi lần đầu vẫn 18:43 (thời điểm gửi ban đầu) | Đạt | 05-5 |
| 5.6 | td_skhcn | Đạt → rời danh sách | Đạt | — |
| 5.7 | td_skhcn | Lịch sử: vòng 1 Chưa đạt, vòng 2 Đạt | Đạt | 05-7 |
| 6.1 | chutri | "Hạn hiện hành: 10/01/2027 … không vượt ngày chốt 31/01/2027" | Đạt (xem lỗi UI-06) | 06-1 |
| 6.2 | chutri | Đặc khu C "15/01/2027 (đã gia hạn)", các đơn vị khác giữ 10/01/2027 | Đạt | 06-2 |
| 6.3 | chutri | Gia hạn tiếp 20/01/2027 được | Đạt | — |
| 6.4 | chutri | Kỳ quý 3: mọi dòng nhãn Quá hạn, không có nút Gia hạn | Đạt | 06-4 |
| 7.1 | chutri | Sở Nội vụ Gửi trễ 4 (đỏ `rgb(179,38,30)`); Đặc khu C Chưa gửi 2 (đỏ); Sở Y tế Chờ thẩm định 2 | Đạt | 06-4 |
| 7.2 | lanhdao | Cùng bảng tiến độ, không có nút nào trong vùng nội dung | Đạt | 07-2 |
| 8.1 | chutri | "Chưa chốt được. Còn 6 đơn vị chưa qua hạn hiện hành (muộn nhất 20/01/2027)." | Đạt | 08-1 |
| 8.2 | chutri | 6 đơn vị, Đạt 14, Chờ 7, Cần bổ sung 1, Chưa gửi 2, có cảnh báo tính 0 điểm | Đạt | 08-2 |
| 8.3 | chutri | Chuyển sang `/ket-qua/2` | Đạt | — |
| 8.4 | chutri | Sở: 99,17 – 33,75 – 30; Xã: 100 – 20 – 12,5 | Đạt | 08-4 |
| 8.5 | chutri | 3 nhóm, trọng số áp dụng 60%, N6 29,5 ÷ 30 | Đạt | 08-5 |
| 8.6 | chutri | CS10 Chờ thẩm định 0/10; CS11, CS12 Không nộp 0 | Đạt | 08-6 |
| 8.7 | dm_xb | "Kỳ đã chốt, dữ liệu của kỳ đã khóa."; mọi chỉ số chỉ còn nút Xem | Đạt | 08-7 |
| 9.1 | chutri | UBND Xã B 81,76, Tốt | Đạt | — |
| 9.2 | chutri | 18÷20, 20,5÷25, 9,2÷15, 5÷5, 16÷20; 85%; CS04 10,5/15, CS05 9,2/10, CS06 0/5 | Đạt | 09-2 |
| 9.3 | chutri | Bảng tổng hợp chung có cột Loại và hạng chung 1–6 | Đạt | 09-3 |
| 9.4 | dm_xb | Thấy điểm và hạng mọi đơn vị; nút Điểm chi tiết chỉ ở dòng Xã B; không có nút Xuất Excel | Đạt | 09-4, 09-4b |
| 9b.1 | lanhdao | 6 đơn vị, TB 76,21, cao nhất 98,05 (Sở KH&CN), thấp nhất 42,3 (Đặc khu C); 3 biểu đồ | Đạt | 09b-1 |
| 9b.2 | lanhdao | Lọc xã → 3 đơn vị, hạng 1–3 theo loại | Đạt | 09b-2 |
| 9b.3 | lanhdao | Tải `ket-qua-ky-1.xlsx` (12 558 B); 4 sheet: Tổng hợp chung, Xếp hạng theo loại, Điểm nhóm, Điểm chỉ số | Đạt | — |
| 9b.4 | lanhdao | So với Kỳ năm 2024; Xã B 63,07 → 81,76 ▲ +18,69, Trung bình → Tốt | Đạt | 09b-4 |
| 9b.5 | lanhdao | Thể chế số 36 → 82; CS03 0 → 10/10 | Đạt (xem lỗi UI-07) | 09b-5 |
| 9b.6 | lanhdao | Đặc khu C "Chỉ có mặt ở kỳ này, không so sánh được" | Đạt (xem lỗi UI-03) | 09b-6 |
| 9b.7 | lanhdao | "Không có kỳ đã chốt liền trước cùng loại…", không có cột chênh lệch | Đạt | 09b-7 |
| 9b.8 | lanhdao | Kỳ quý 3 so với Kỳ quý 2 năm 2026 | Đạt | 09b-8 |
| 10.1 | admin | Menu chỉ có Tài khoản, Nhật ký; vào `/ket-qua/1` bị đưa về `/tai-khoan` | Đạt | 10-1 |
| 10.2 | admin | "Cán bộ đầu mối và chuyên viên thẩm định phải thuộc một đơn vị." | Đạt | 10-2 |
| 10.3 | admin | Tạo `dm_test_ui` → Sửa → Khóa → "Đã khóa", không có nút xóa; đăng nhập bằng tài khoản này báo "Tài khoản đã bị khóa." | Đạt | 10-3, 10-3b-dang-nhap |
| 10.3b | admin | Tải tệp mẫu được (`mau-nhap-tai-khoan.xlsx`); nhập 3 dòng → tạo 1 (`dm_excel_ok`), bỏ qua dòng 3 "trùng tên đăng nhập" và dòng 4 "sai mã vai trò" | Đạt | 10-3b-nhap-excel |
| 10.4 | admin | Có MO_KY, GUI_BAO_CAO, KET_LUAN_THAM_DINH (2 lần), GUI_LAI_BAO_CAO, GIA_HAN (2 lần), CHOT_KY của phiên test; chỉ có nút Tìm | Đạt (xem lỗi UI-05) | 10-4 |
| 11.1 | chutri | "Đơn vị đã được giao vào kỳ, không xóa được. (BR24)" | Đạt | 11-1 |
| 11.2 | chutri | "Loại minh chứng đã được dùng, không xóa được. (BR24)" | Đạt | 11-2 |

## 4. Ca ngoài kịch bản

| # | Ca | Kết quả | KQ | Ảnh |
|---|---|---|---|---|
| N1 | Đăng nhập `chutri` sai mật khẩu | "Sai tên đăng nhập hoặc mật khẩu.", vẫn ở trang đăng nhập | Đạt | 00 |
| N2 | Đăng nhập tài khoản không tồn tại | Cùng thông báo trên (không lộ việc tài khoản có tồn tại hay không) | Đạt | — |
| N3 | Bấm Đăng nhập khi để trống cả hai ô | Báo "Sai tên đăng nhập hoặc mật khẩu." | Lỗi thấp UI-02 | 15 |
| N4 | Token giả trong localStorage rồi mở `/bao-cao` | Quay về form đăng nhập, không trắng trang | Đạt | — |
| N5 | `td_skhcn` mở URL `/bo-chi-so/1`, `/ky/1`, `/tai-khoan`, `/nhat-ky`, `/bao-cao/17`, `/dashboard`, `/so-sanh/1`, URL không tồn tại | Tất cả về `/tham-dinh` | Đạt | — |
| N6 | `td_skhcn` gọi API `/api/nguoidung`, `/api/nhatky`, `/api/baocao/giao/17` | 403 | Đạt | — |
| N7 | `dm_xb` mở `/dashboard`, `/so-sanh/1`, `/ky/1`, `/tham-dinh` | Về `/bao-cao` | Đạt | — |
| N8 | `dm_xb` mở `/bao-cao/1` (lượt giao của đơn vị khác) | "Bạn chỉ xem được báo cáo của đơn vị mình. (BR19)"; trang không có link quay lại | Đạt (UX nhỏ, xem UI-02) | 14 |
| N9 | `admin` mở `/ket-qua/1` | Về `/tai-khoan` | Đạt | — |
| N10 | Minh chứng: tải `.exe` | "Tệp không đúng định dạng. Chỉ nhận PDF, Word, Excel, JPG, PNG." | Đạt | 12 |
| N11 | Minh chứng: tệp đuôi `.pdf` nhưng nội dung không phải PDF (`MZ…`) | **Được nhận**, hiện "Còn hiệu lực" | **Lỗi trung bình UI-01** | 12b |
| N12 | Nhập tài khoản: tải `.txt` | "Chỉ nhận tệp .xlsx theo mẫu." | Đạt | 13a |
| N13 | Nhập tài khoản: tệp đuôi `.xlsx` nhưng nội dung là văn bản | "Không đọc được tệp. Hãy dùng tệp .xlsx theo mẫu." | Đạt | 13b |
| N14 | Gia hạn với hạn mới bằng đúng hạn hiện hành (10/01/2027) | Máy chủ chặn: "Hạn mới phải sau hạn hiện hành (10/01/2027). (BR22)" | Đạt (xem UI-06) | — |

## 5. Danh sách lỗi

### UI-01 — Minh chứng chỉ kiểm tra đuôi tệp, không kiểm tra nội dung (Trung bình)

- **Mã liên quan:** BR05, UC 3.2
- **Bước tái hiện:** `dm_xb` → Báo cáo của đơn vị → Kỳ quý 4 năm 2026 → CS12 → Nhập → Tải tệp lên một tệp đặt tên `gia-pdf.pdf` có nội dung `MZ fake` (đầu tệp thực thi Windows).
- **Mong đợi:** Từ chối vì tệp không phải PDF thật, giống thông báo khi tải `.exe`.
- **Thực tế:** Tệp được lưu, hiện trong bảng minh chứng với trạng thái "Còn hiệu lực". Chuyên viên thẩm định có thể tải tệp này về máy.
- **Nghi ngờ:** `server/src/routes/nghiepvu.js:161-163`. `fileFilter` chỉ so `path.extname(file.originalname)` với `C.DUOI_TEP` và không kiểm tra magic bytes hay MIME. Tệp đã lưu cũng giữ đúng đuôi người dùng gửi (dòng 158).
- **Ghi chú:** Dữ liệu test còn lại: CS12 kỳ quý 4 của Xã B có 1 tệp `gia-pdf.pdf` ở trạng thái Nháp.

### UI-02 — Thông báo khi để trống form đăng nhập gây hiểu nhầm; trang chặn quyền không có đường quay lại (Thấp)

- **Mã liên quan:** UC đăng nhập; BR19
- **Tái hiện 1:** Ở trang đăng nhập, để trống cả hai ô rồi bấm Đăng nhập.
  - **Mong đợi:** Báo cần nhập tên đăng nhập và mật khẩu, hoặc ô bắt buộc chặn gửi form.
  - **Thực tế:** Báo "Sai tên đăng nhập hoặc mật khẩu." Hai `<input>` không có `required`.
  - **Nghi ngờ:** `client/src/App.jsx:39-40` (input không có `required`) và `server/src/routes/hethong.js:15-17`.
- **Tái hiện 2:** `dm_xb` mở thẳng `/bao-cao/1`.
  - **Thực tế:** Trang chỉ có một dòng lỗi BR19, không có link "← Các kỳ của đơn vị". Người dùng phải dùng menu.
  - **Nghi ngờ:** `client/src/pages/BaoCao.jsx:75`, khi lỗi tải trang thì không hiện link quay lại.

### UI-03 — So sánh kỳ: đơn vị không có ở kỳ trước bị ghi "Không áp dụng" ở cột Kỳ trước (Thấp)

- **Mã liên quan:** UC 5.2 luồng 4a
- **Bước tái hiện:** `lanhdao` → So sánh các kỳ → Kỳ năm 2025 → dòng UBND Đặc khu C → Theo nhóm.
- **Mong đợi:** Cột Kỳ trước để "—" hoặc "Không có dữ liệu", vì đơn vị không tham gia kỳ 2024.
- **Thực tế:** Mọi nhóm đều ghi "Không áp dụng". Cụm này dùng cho nhóm không có chỉ số áp dụng với loại đơn vị, nên người đọc dễ hiểu sai.
- **Nghi ngờ:** `client/src/pages/TongHop.jsx:153` (`n.DiemTruoc === null ? 'Không áp dụng'`). Không phân biệt trường hợp "đơn vị vắng mặt" với "nhóm không áp dụng".

### UI-04 — Hộp "Giao đơn vị vào kỳ" hiện lỗi cũ BR17 (Thấp)

- **Mã liên quan:** BR17, UC 2.2
- **Bước tái hiện:** Bước 2.3 (Mở kỳ khi chưa giao, nhận lỗi BR17) → bấm Giao đơn vị.
- **Mong đợi:** Hộp giao đơn vị mở sạch, không có lỗi.
- **Thực tế:** Dòng đỏ đầu hộp vẫn ghi "Kỳ cần ít nhất một lượt giao đơn vị mới được mở. (BR17)", dù người dùng đang làm đúng việc mà lỗi yêu cầu.
- **Nghi ngờ:** `client/src/pages/Ky.jsx:111`. Hộp dùng chung `tt.loi` với trang và không xóa lỗi khi mở hộp (tương tự ở dòng 119, 128).
- **Ảnh:** `02-4a-hop-giao-con-loi-cu.png`

### UI-05 — Thông báo và nhật ký xếp theo mã tự tăng, không theo thời gian (Thấp)

- **Mã liên quan:** BR15, BR20, UC 1.3
- **Bước tái hiện:** `dm_xb` → Thông báo, hoặc `admin` → Nhật ký.
- **Mong đợi:** Mới nhất ở trên, theo thời gian.
- **Thực tế:** Trong hộp Thông báo, các mục của "Kỳ năm 2024" (2025) nằm trên "Kỳ quý 4 năm 2026" (1/11/26). Trong Nhật ký, dòng 10:00 8/7/26 nằm dưới dòng 14:00 20/7/26 rồi lại xen kẽ. Lỗi lộ ra với dữ liệu mẫu (tạo không theo thứ tự thời gian) hoặc khi có dữ liệu nhập/di chuyển.
- **Nghi ngờ:** `server/src/routes/hethong.js:35` (`orderBy('MaTB','desc')`) và `:119` (`orderBy('k.MaNK','desc')`).
- **Quan sát thêm (thông tin):** Tạo kỳ, sao chép/xóa bộ chỉ số, sửa nhóm, giao đơn vị khi kỳ còn Nháp (`services/ky.js:75` chỉ ghi khi kỳ đang mở), tải/thay thế minh chứng và khóa danh mục **không** ghi nhật ký. Cần đối chiếu phạm vi BR20 xem có cần ghi không.

### UI-06 — Ô chọn hạn mới cho phép chọn đúng hạn hiện hành (Thấp)

- **Mã liên quan:** BR22, UC 2.3
- **Bước tái hiện:** `chutri` → Kỳ quý 4 → Gia hạn (Đặc khu C) → chọn 10/01/2027.
- **Mong đợi:** Lịch không cho chọn 10/01 (`min` = hạn hiện hành + 1 ngày).
- **Thực tế:** `min="2027-01-10"` nên chọn được. Phải bấm Gia hạn mới thấy máy chủ báo lỗi BR22. Máy chủ chặn đúng, chỉ là UX.
- **Nghi ngờ:** `client/src/pages/Ky.jsx:121` (`min={giaHan.HanHienHanh}`).

### UI-07 — Bảng so sánh từng chỉ số hiển thị không thống nhất (Thấp)

- **Mã liên quan:** UC 5.2 bước 6
- **Bước tái hiện:** `lanhdao` → So sánh các kỳ → Kỳ năm 2025 → Xã B → Theo nhóm → bảng "Điểm từng chỉ số".
- **Thực tế:** Cột Kỳ trước ghi "10", "5", "6,47", còn cột Kỳ này ghi "10/10", "8/10". Hai cột dùng hai định dạng.
- **Nghi ngờ:** `client/src/pages/TongHop.jsx`, phần bảng chỉ số ngay dưới dòng 153.

## 6. Những gì chưa kiểm hoặc giới hạn

- Hộp thoại `prompt`/`confirm` gốc được thay bằng câu trả lời định sẵn (xem mục 1). Chưa kiểm hành vi khi người dùng bấm Cancel trên hộp thoại thật.
- Không kiểm giới hạn 10 MB (cần tạo tệp lớn) và chưa thử tải song song.
- Không mở cửa sổ ẩn danh thật. Hai vai được đổi tuần tự trong một tab.
- Biểu đồ dashboard được kiểm qua nội dung chữ và ảnh chụp, không đo pixel.

## 7. Output cuối

Phần này kiểm thử giao diện bằng trình duyệt, không có tệp `node --test`. Output cuối của các lệnh kiểm chứng:

```
$ npm run db:reset
Đã xóa các bảng cũ.
Đã tạo 19 bảng.
Đã tạo dữ liệu mẫu. Mật khẩu mọi tài khoản mẫu: 123456

$ orca exec --command errors      (chạy sau mục 1, 3, 10 và cuối phiên)
{ "errors": [] }

$ curl thời gian phản hồi API (chutri)
/ky 200 0.006s | /ky/2 200 0.010s | /ketqua/ky/1 200 0.005s | /dashboard/ky/1 200 0.009s
/sosanh/ky/1 200 0.012s | /bochiso/1 200 0.008s | /ketqua/ky/1/xuat 200 0.048s

$ node -e "<exceljs đọc ket-qua-ky-1.xlsx>"
Tổng hợp chung 8
Xếp hạng theo loại 7
Điểm nhóm 7
Điểm chỉ số 55

$ Dừng server
stopped 4000 pid 27256
stopped 5173 pid 14432
(cổng 4000/5173 còn lắng nghe: 0)
```

Kết luận: 76 ca. Toàn bộ 62 bước kịch bản demo đạt. Tìm được 7 lỗi: 1 trung bình (UI-01, minh chứng chỉ kiểm tra đuôi tệp) và 6 thấp về UX/hiển thị. Không có lỗi chặn demo.
