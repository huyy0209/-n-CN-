# Mẫu một quy trình trọn vẹn: tạo mới → nộp → thẩm định → chấm điểm

Tài liệu này cho sẵn mọi thứ để tự tay chạy một kỳ đánh giá mới từ con số 0: bộ chỉ số mẫu, kỳ mẫu, số liệu mẫu để gõ, tệp minh chứng mẫu, và bảng điểm tính tay để đối chiếu với kết quả phần mềm.

Khác với `HUONG_DAN_DEMO.md` (dùng dữ liệu có sẵn), ở đây mọi thứ do bạn tự tạo. Thời gian làm: khoảng 15–20 phút.

Mọi con số dưới đây là giả định để minh họa. Kết quả mong đợi đã được chạy thử qua đúng phần tính điểm của phần mềm.

## Các mẫu kèm theo

| Mẫu | Ở đâu | Dùng ở bước |
|---|---|---|
| Mẫu 1 – Bộ chỉ số | Mục 1 bên dưới | Bước 1 |
| Mẫu 2 – Kỳ đánh giá | Mục 2 | Bước 2 |
| Mẫu 3 – Số liệu báo cáo của 3 đơn vị | Mục 3 | Bước 3 |
| Mẫu 4 – Tệp minh chứng (6 tệp) | Thư mục `mau/minh-chung/` | Bước 3 |
| Mẫu 5 – Kết luận thẩm định | Mục 4 | Bước 4 |
| Mẫu 6 – Bảng điểm tính tay | Mục 6 | Bước 5, đối chiếu |

Tệp minh chứng mẫu, mỗi chỉ số một tệp, dùng chung cho các đơn vị:

| Chỉ số | Tệp |
|---|---|
| M01 | `M01-thong-ke-may-tinh-ket-noi-mang.docx` |
| M02 | `M02-bien-ban-mang-truyen-so-lieu.pdf` |
| M03 | `M03-tong-hop-ho-so-truc-tuyen.docx` |
| M04 | `M04-danh-sach-hoat-dong-tuyen-truyen.pdf` |
| M05 | `M05-thong-ke-ho-co-cap-quang.docx` |
| M06 | `M06-danh-muc-he-thong-phe-duyet-cap-do.pdf` |

## Tài khoản dùng

Mật khẩu chung `123456`.

| Vai trò | Tài khoản |
|---|---|
| Cán bộ chủ trì | `chutri` |
| Đầu mối Sở Y tế | `dm_syt` |
| Đầu mối UBND Xã B | `dm_xb` |
| Đầu mối UBND Phường A | `dm_pa` |
| Chuyên viên thẩm định | `td_skhcn` (thuộc Sở KH&CN nên thẩm định được cả ba đơn vị trên) |

## Bước 1 – Tạo bộ chỉ số mới (`chutri`)

Menu **Bộ chỉ số** → **Tạo bộ mới** → tên: `Bộ chỉ số mẫu 2026`.

### Mẫu 1a – Nhóm chỉ số

Bấm **Thêm nhóm** ba lần:

| Tên nhóm | Trọng số |
|---|---|
| Hạ tầng số | 30 |
| Hoạt động chuyển đổi số | 50 |
| An toàn thông tin mạng | 20 |

Tổng trọng số phải hiện 100%.

### Mẫu 1b – Chỉ số

Trong từng nhóm bấm **Thêm chỉ số**. Mọi chỉ số: tần suất **Năm**, tick **Bắt buộc minh chứng**.

| Nhóm | Ký hiệu | Tên chỉ số | Kiểu | Điểm tối đa | Khai báo thêm | Áp dụng |
|---|---|---|---|---|---|---|
| Hạ tầng số | M01 | Tỷ lệ cán bộ có máy tính kết nối mạng | Tỷ lệ | 10 | Chỉ tiêu 100; miền 0–100; đơn vị tính % | Cả hai loại |
| Hạ tầng số | M02 | Kết nối mạng truyền số liệu chuyên dùng | Có/không | 10 | — | Cả hai loại |
| Hoạt động chuyển đổi số | M03 | Tỷ lệ hồ sơ thủ tục hành chính trực tuyến toàn trình | Tỷ lệ | 20 | Chỉ tiêu 80; miền 0–100; đơn vị tính % | Cả hai loại |
| Hoạt động chuyển đổi số | M04 | Số hoạt động tuyên truyền | Bậc thang | 10 | Miền 0–1000; đơn vị tính "hoạt động"; bậc điểm theo Mẫu 1c | Cả hai loại |
| Hoạt động chuyển đổi số | M05 | Tỷ lệ hộ gia đình có cáp quang | Tỷ lệ | 10 | Chỉ tiêu 85; miền 0–100; đơn vị tính % | Chỉ UBND xã, phường, đặc khu |
| An toàn thông tin mạng | M06 | Tỷ lệ hệ thống thông tin được phê duyệt cấp độ | Tỷ lệ | 10 | Chỉ tiêu 100; miền 0–100; đơn vị tính % | Chỉ Sở, ban, ngành |

Chiều tốt để mặc định **Cao tốt**.

### Mẫu 1c – Bậc điểm của M04

Bấm **Thêm bậc** bốn lần:

| Từ giá trị | Đến giá trị | Điểm |
|---|---|---|
| 0 | 0 | 0 |
| 1 | 2 | 5 |
| 3 | 5 | 8 |
| 6 | (bỏ trống) | 10 |

### Mẫu 1d – Ngưỡng mức độ

Bấm **Sửa ngưỡng** → **Thêm mức** năm lần:

| Tên mức | Từ điểm | Đến điểm |
|---|---|---|
| Yếu | 0 | 50 |
| Trung bình | 50 | 65 |
| Khá | 65 | 80 |
| Tốt | 80 | 90 |
| Xuất sắc | 90 | 100 |

### Ban hành

Bấm **Ban hành** → xác nhận. Bộ chuyển sang **Ban hành** và bị khóa.

Nếu bị chặn, phần mềm liệt kê lỗi cụ thể (tổng trọng số khác 100, chỉ số chưa chọn loại đơn vị, bậc điểm chồng khoảng, ngưỡng không phủ 0–100). Sửa theo danh sách rồi ban hành lại.

## Bước 2 – Tạo kỳ, giao đơn vị, mở kỳ (`chutri`)

### Mẫu 2 – Kỳ đánh giá

Menu **Kỳ đánh giá** → **Tạo kỳ**:

| Trường | Giá trị |
|---|---|
| Tên kỳ | Kỳ năm mẫu 2026 |
| Loại kỳ | Năm |
| Bộ chỉ số | Bộ chỉ số mẫu 2026 |
| Ngày bắt đầu số liệu | 01/01/2026 |
| Ngày kết thúc số liệu | 31/10/2026 |
| Hạn nộp | 10/11/2026 |
| Ngày chốt dự kiến | 30/11/2026 |

Hạn nộp cố ý đặt ở quá khứ. Phần mềm chỉ cho chốt kỳ khi mọi đơn vị đã qua hạn, nên đặt hạn đã qua thì làm xong là chốt được ngay trong buổi. Hệ quả: mọi báo cáo sẽ được đếm là gửi trễ, nhưng trễ hạn không trừ điểm.

### Giao đơn vị và mở kỳ

1. **Giao đơn vị** → bỏ tick hết, chỉ tick **Sở Y tế**, **UBND Phường A**, **UBND Xã B** → Giao 3 đơn vị.
2. Kiểm tra cột Chỉ số: mỗi đơn vị 5 chỉ số (sở: M01–M04, M06; xã, phường: M01–M05).
3. **Mở kỳ** → xác nhận.

## Bước 3 – Nhập số liệu và gửi (ba đầu mối)

Mỗi đầu mối đăng nhập → **Báo cáo của đơn vị** → **Kỳ năm mẫu 2026**. Với từng chỉ số: **Nhập** → gõ giá trị → chọn loại minh chứng → **Tải tệp lên** (tệp tương ứng trong `mau/minh-chung/`) → **Gửi thẩm định**.

### Mẫu 3 – Số liệu báo cáo

| Chỉ số | Sở Y tế (`dm_syt`) | UBND Xã B (`dm_xb`) | UBND Phường A (`dm_pa`) |
|---|---|---|---|
| M01 | 90 | 80 | 100 |
| M02 | Có | Không | Có |
| M03 | 60 | 72 | 88 |
| M04 | 4 | 2 | 7 |
| M05 | (không áp dụng) | 68 | **95** |
| M06 | 75 | (không áp dụng) | (không áp dụng) |

Số 95 của Phường A ở M05 là số **cố ý nhập sai**: tệp minh chứng M05 ghi 59%. Đây là tình huống để chuyên viên phát hiện ở bước 4.

Sau bước này mỗi đơn vị có 5 báo cáo ở trạng thái **Chờ thẩm định**.

## Bước 4 – Thẩm định (`td_skhcn`)

Menu **Chờ thẩm định** → lần lượt mở 15 báo cáo của Kỳ năm mẫu 2026.

### Mẫu 5 – Kết luận thẩm định

| Báo cáo | Kết luận | Nhận xét |
|---|---|---|
| 14 báo cáo còn lại | Đạt | (không cần) |
| UBND Phường A – M05 | **Chưa đạt** | Số liệu báo cáo 95% không khớp bảng thống kê đính kèm (2.360 ÷ 4.000 hộ = 59%). Đề nghị rà soát và gửi lại. |

Sau bước này: 14 báo cáo **Đạt**, 1 báo cáo **Cần bổ sung**.

Kịch bản này để nguyên báo cáo M05 của Phường A ở trạng thái Cần bổ sung, nhằm cho thấy chỉ số chưa Đạt tính 0 điểm khi chốt. Phương án khác ở mục 7.

## Bước 5 – Chốt kỳ và xem điểm (`chutri`)

**Kỳ đánh giá** → Kỳ năm mẫu 2026 → **Chốt kỳ**.

Hộp thoại thống kê phải hiện: 3 đơn vị, Đạt 14, Chờ thẩm định 0, Cần bổ sung 1, Chưa gửi 0, kèm cảnh báo chỉ số chưa Đạt tính 0 điểm. Bấm **Xác nhận chốt kỳ**.

### Kết quả mong đợi

| Đơn vị | Tổng điểm | Mức độ | Hạng theo loại | Hạng chung |
|---|---|---|---|---|
| UBND Phường A | 84,38 | Tốt | 1 (xã, phường) | 1 |
| Sở Y tế | 81,83 | Tốt | 1 (sở) | 2 |
| UBND Xã B | 63,44 | Trung bình | 2 (xã, phường) | 3 |

Bấm **Điểm chi tiết** ở từng dòng để so với bảng tính tay ở mục 6.

## 6. Mẫu 6 – Bảng điểm tính tay

Công thức:

- Có/không: Có thì đủ điểm tối đa, Không thì 0.
- Tỷ lệ (cao tốt): điểm = min(giá trị ÷ chỉ tiêu; 1) × điểm tối đa.
- Bậc thang: tra theo bảng bậc điểm.
- Tỷ lệ nhóm = tổng điểm đạt ÷ tổng điểm tối đa của các chỉ số áp dụng trong nhóm.
- Tổng điểm = tổng (tỷ lệ nhóm × trọng số) ÷ tổng trọng số áp dụng × 100, làm tròn 2 chữ số.

### Sở Y tế — trọng số áp dụng 100

| Chỉ số | Giá trị | Cách tính | Điểm |
|---|---|---|---|
| M01 | 90% | 90 ÷ 100 × 10 | 9/10 |
| M02 | Có | Đủ điểm | 10/10 |
| M03 | 60% | 60 ÷ 80 × 20 | 15/20 |
| M04 | 4 hoạt động | Bậc 3–5 | 8/10 |
| M06 | 75% | 75 ÷ 100 × 10 | 7,5/10 |

| Nhóm | Điểm đạt ÷ tối đa | Tỷ lệ nhóm | Trọng số | Đóng góp |
|---|---|---|---|---|
| Hạ tầng số | 19 ÷ 20 | 0,95 | 30 | 28,5 |
| Hoạt động chuyển đổi số | 23 ÷ 30 | 0,7667 | 50 | 38,33 |
| An toàn thông tin mạng | 7,5 ÷ 10 | 0,75 | 20 | 15 |
| Cộng | | | 100 | 81,83 |

Tổng điểm = 81,83 ÷ 100 × 100 = **81,83**.

### UBND Xã B — trọng số áp dụng 80

| Chỉ số | Giá trị | Cách tính | Điểm |
|---|---|---|---|
| M01 | 80% | 80 ÷ 100 × 10 | 8/10 |
| M02 | Không | 0 điểm | 0/10 |
| M03 | 72% | 72 ÷ 80 × 20 | 18/20 |
| M04 | 2 hoạt động | Bậc 1–2 | 5/10 |
| M05 | 68% | 68 ÷ 85 × 10 | 8/10 |

| Nhóm | Điểm đạt ÷ tối đa | Tỷ lệ nhóm | Trọng số | Đóng góp |
|---|---|---|---|---|
| Hạ tầng số | 8 ÷ 20 | 0,40 | 30 | 12 |
| Hoạt động chuyển đổi số | 31 ÷ 40 | 0,775 | 50 | 38,75 |
| Cộng | | | 80 | 50,75 |

Nhóm An toàn thông tin mạng không có chỉ số nào áp dụng cho xã nên bị loại, trọng số tính trên 80.

Tổng điểm = 50,75 ÷ 80 × 100 = 63,4375, làm tròn **63,44**.

### UBND Phường A — trọng số áp dụng 80

| Chỉ số | Giá trị | Cách tính | Điểm |
|---|---|---|---|
| M01 | 100% | 100 ÷ 100 × 10 | 10/10 |
| M02 | Có | Đủ điểm | 10/10 |
| M03 | 88% | min(88 ÷ 80; 1) × 20, chặn trần | 20/20 |
| M04 | 7 hoạt động | Bậc từ 6 | 10/10 |
| M05 | 95% (Cần bổ sung) | Chưa Đạt nên 0 điểm | 0/10 |

| Nhóm | Điểm đạt ÷ tối đa | Tỷ lệ nhóm | Trọng số | Đóng góp |
|---|---|---|---|---|
| Hạ tầng số | 20 ÷ 20 | 1,00 | 30 | 30 |
| Hoạt động chuyển đổi số | 30 ÷ 40 | 0,75 | 50 | 37,5 |
| Cộng | | | 80 | 67,5 |

Tổng điểm = 67,5 ÷ 80 × 100 = 84,375, làm tròn **84,38**.

## 7. Phương án khác: Phường A bổ sung trước khi chốt

Nếu muốn trình diễn cả vòng bổ sung, trước bước 5 làm thêm:

1. `dm_pa` mở M05 (đang Cần bổ sung) → sửa giá trị thành **59** → **Gửi lại**.
2. `td_skhcn` → Chờ thẩm định → M05 của Phường A (ghi "Gửi lại (vòng 2)") → **Đạt**.

Khi đó M05 = 59 ÷ 85 × 10 = 6,94 điểm. Nhóm Hoạt động chuyển đổi số = 36,94 ÷ 40. Tổng điểm của Phường A = (30 + 36,94 ÷ 40 × 50) ÷ 80 × 100 = **95,22**, mức Xuất sắc. Hộp thoại chốt kỳ sẽ hiện Đạt 15, Cần bổ sung 0. Điểm và hạng của hai đơn vị kia không đổi.

So hai phương án cho thấy rõ: cùng một đơn vị, để chỉ số ở trạng thái chưa Đạt thì mất trọn điểm chỉ số đó (84,38 so với 95,22).

## 8. Những ý báo cáo mà quy trình này chứng minh

| Chỗ trong quy trình | Ý trong báo cáo |
|---|---|
| Bước 1: ban hành xong thì bộ bị khóa | BR14, RB13 |
| Bước 1: ba kiểu công thức M02, M01/M03, M04 | BR01 |
| Bước 2: sở và xã có tập chỉ số khác nhau | BR03, RB11 |
| Bước 3: thiếu minh chứng thì không gửi được | BR06, RB16 |
| Bước 4: Chưa đạt phải có nhận xét | RB07, BR09 |
| Bước 5: M05 của Phường A tính 0 điểm | BR10 |
| Mục 6: xã tính trên trọng số 80 | BR02 |
| Mục 6: M03 của Phường A chặn trần ở 20 | BR01 |
| Mục 6: 63,4375 thành 63,44 | BR23 |
| Kết quả: hạng theo loại và hạng chung | BR12 |

## Lưu ý

- Làm lại từ đầu: đóng ứng dụng, chạy `npm run db:reset` trong `server`. Lệnh này xóa cả bộ và kỳ mẫu vừa tạo.
- Bộ đã ban hành và kỳ đã mở thì không xóa được trên giao diện (đúng quy tắc BR24). Muốn dọn thì dùng `db:reset`.
- Nếu tạo kỳ vào ngày khác, giữ nguyên nguyên tắc: hạn nộp trước ngày hôm nay, ngày chốt dự kiến từ hạn nộp trở đi.
