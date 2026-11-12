# Hướng dẫn thao tác và kịch bản demo (IS028)

Tài liệu này đi qua từng chức năng theo đúng thứ tự một kỳ đánh giá. Mỗi bước ghi: thao tác, kết quả sẽ thấy, và ý trong báo cáo mà bước đó chứng minh (mã BR, RB, UC).

Thời lượng: khoảng 12–15 phút nếu làm đủ. Bản rút gọn 5 phút ở cuối tệp.

## 0. Chuẩn bị trước khi demo

1. Nạp lại dữ liệu mẫu để số liệu khớp kịch bản. Đóng hai cửa sổ API và Giao diện (nếu đang mở), rồi trong thư mục `server` chạy:
   ```bash
   npm run db:reset
   ```
2. Chạy `start.bat`. Trình duyệt mở http://127.0.0.1:5173.
3. Mở thêm một cửa sổ **ẩn danh** cùng địa chỉ. Hai cửa sổ đăng nhập hai vai trò khác nhau, đổi vai không cần đăng xuất. (Hai tab thường trong cùng một cửa sổ dùng chung phiên đăng nhập, nên phải dùng cửa sổ ẩn danh.)
4. Chuẩn bị sẵn hai tệp PDF bất kỳ dưới 10 MB để làm minh chứng. Có thể dùng `server/uploads/minh-chung-mau.pdf`.

Mật khẩu mọi tài khoản mẫu: `123456`.

| Vai trò | Tài khoản dùng trong kịch bản |
|---|---|
| Cán bộ cơ quan chủ trì | `chutri` |
| Cán bộ đầu mối | `dm_xb` (UBND Xã B) |
| Chuyên viên thẩm định | `td_skhcn` (Sở KH&CN), `td_syt` (Sở Y tế) |
| Lãnh đạo | `lanhdao` |
| Quản trị hệ thống | `admin` |

Dữ liệu sau khi nạp lại: Kỳ năm 2025 đã chốt; Kỳ quý 3 năm 2026 đang mở và đã quá hạn; Kỳ quý 4 năm 2026 đang mở, còn hạn.

## 1. Bộ chỉ số theo phiên bản — `chutri`

**Ý nêu bật:** bộ chỉ số thay đổi theo từng lần ban hành, nên hệ thống quản lý theo phiên bản để kết quả kỳ cũ không mất căn cứ chấm (mục 2.1.1, BR14).

| Bước | Thao tác | Kết quả | Chứng minh |
|---|---|---|---|
| 1.1 | Menu **Bộ chỉ số** → mở "Bộ chỉ số chuyển đổi số minh họa (Phụ lục B)" | Nhãn **Ban hành**, dòng thông báo bộ đã khóa, không có nút sửa nhóm hay chỉ số | BR14, RB13 |
| 1.2 | Chỉ vào bảng chỉ số | Đủ ba kiểu công thức: CS01 có/không, CS04 tỷ lệ so chỉ tiêu, CS02 bậc thang. CS10 ghi "thấp tốt" | BR01 |
| 1.3 | Chỉ cột Áp dụng và Tần suất | CS09 chỉ áp dụng cho sở; CS13, CS14 chỉ cho xã. CS08, CS10, CS11, CS12 tần suất quý | BR03, BR04 |
| 1.4 | Bấm **Sao chép thành bộ mới**, giữ tên gợi ý | Mở bộ mới ở trạng thái **Nháp**, đủ 6 nhóm, 15 chỉ số, 5 mức độ | UC 1.5 luồng Sao chép |
| 1.5 | Nhóm "Nhận thức số" → **Sửa nhóm** → đổi trọng số 10 thành 20 → bấm **Ban hành** | Bị chặn: "Tổng trọng số các nhóm phải bằng 100 (hiện là 110). (RB08)" | RB08, UC 1.5 bước 5a |
| 1.6 | Bấm **Xóa bộ** để dọn bộ nháp | Quay về danh sách, còn một bộ | Bộ Nháp xóa được, bộ Ban hành thì không |

Câu nói gợi ý: "Muốn đổi công thức thì sao chép thành bộ mới. Kỳ năm 2025 vẫn trỏ về bộ cũ, nên 81,76 điểm của Xã B không bao giờ bị tính lại."

## 2. Tạo kỳ, giao đơn vị, mở kỳ — `chutri`

**Ý nêu bật:** kỳ có bốn mốc ngày và chỉ mở khi đã giao đơn vị (BR17, RB04).

| Bước | Thao tác | Kết quả | Chứng minh |
|---|---|---|---|
| 2.1 | Menu **Kỳ đánh giá** → **Tạo kỳ**. Tên "Kỳ năm 2026", loại Năm, bắt đầu 01/01/2026, kết thúc 31/12/2026, hạn nộp **01/12/2026**, ngày chốt 28/02/2027 → Tạo | Bị chặn: bốn mốc ngày phải đúng thứ tự (RB04) | RB04 |
| 2.2 | Sửa hạn nộp thành 15/01/2027 → Tạo | Vào trang kỳ, trạng thái **Nháp** | BR17, Bảng B.4 |
| 2.3 | Bấm **Mở kỳ** ngay | Bị chặn: kỳ cần ít nhất một lượt giao (BR17) | BR17 |
| 2.4 | **Giao đơn vị** → để nguyên 6 đơn vị đã tick → Giao 6 đơn vị | Bảng tiến độ hiện 6 dòng. Sở có 9 chỉ số, xã có 9 chỉ số (khác tập chỉ số) | UC 2.2, BR03 |
| 2.5 | **Mở kỳ** → xác nhận | Trạng thái **Đang mở** | UC 2.1 |

Điểm đáng nói ở bước 2.4: Sở Khoa học và Công nghệ là cơ quan chủ trì nhưng cũng được giao kỳ và xếp hạng như đơn vị khác (mục 2.3.1).

## 3. Nhập số liệu, minh chứng, gửi — `dm_xb` (cửa sổ ẩn danh)

**Ý nêu bật:** hệ thống tự kiểm tra trước khi báo cáo đến tay người thẩm định, bỏ được một vòng trao đổi so với làm thủ công (mục 2.1.3, BR06, BR21).

| Bước | Thao tác | Kết quả | Chứng minh |
|---|---|---|---|
| 3.1 | Đăng nhập `dm_xb` → bấm **Thông báo** | Có thông báo "Kỳ năm 2026 đã mở. Hạn nộp…" | BR15 |
| 3.2 | Menu **Báo cáo của đơn vị** | Chỉ thấy các kỳ của UBND Xã B, không thấy đơn vị khác | BR19 |
| 3.3 | Mở **Kỳ quý 4 năm 2026** | Chỉ có 4 chỉ số tần suất quý: CS08, CS10, CS11, CS12. CS08 đang Nháp | BR04, RB11 |
| 3.4 | Dòng CS11 → **Nhập** → gõ 150 → **Lưu nháp** | Lưu được, kèm cảnh báo vàng: giá trị ngoài miền hợp lệ | BR21 |
| 3.5 | Bấm **Gửi thẩm định** | Bị chặn với hai lỗi: giá trị ngoài miền; thiếu minh chứng bắt buộc (RB16) | BR06, RB16 |
| 3.6 | Sửa thành 64 → chọn loại minh chứng → **Tải tệp lên** → chọn tệp PDF thứ nhất | Tệp hiện trong bảng, trạng thái Còn hiệu lực | UC 3.2, BR05 |
| 3.7 | **Gửi thẩm định** | Hộp thoại đóng, CS11 chuyển **Chờ thẩm định** | UC 3.3, BR08 |
| 3.8 | Mở lại CS11 (nút giờ là **Xem**) | Ô giá trị bị khóa, không còn nút lưu hay gửi | Bảng 3.15: đang chờ thẩm định thì giữ nguyên bản đã gửi |

## 4. Thẩm định — `td_syt` rồi `td_skhcn`

**Ý nêu bật:** tách người lập và người kiểm tra; chuyên viên không thẩm định báo cáo của đơn vị mình (BR18, RB14).

| Bước | Thao tác | Kết quả | Chứng minh |
|---|---|---|---|
| 4.1 | Cửa sổ thường: đăng xuất, đăng nhập `td_syt` → **Chờ thẩm định** | Danh sách **không có** báo cáo nào của Sở Y tế | BR18 khi lọc danh sách |
| 4.2 | Đăng xuất, đăng nhập `td_skhcn` → **Chờ thẩm định** | Thấy thêm 2 báo cáo của Sở Y tế (CS11, CS12 kỳ quý 3) mà `td_syt` không thấy | BR18, BR09 (tự chọn, không phân công) |
| 4.3 | Dòng UBND Xã B – CS11 – Kỳ quý 4 → **Thẩm định** | Trang chi tiết: số liệu 64%, chỉ tiêu 80, tệp minh chứng bấm tải về được | UC 4.2 |
| 4.4 | Bấm **Chưa đạt, yêu cầu bổ sung** khi chưa gõ nhận xét | Bị chặn: Chưa đạt bắt buộc có nhận xét | RB07 |
| 4.5 | Gõ nhận xét "Thiếu bảng thống kê hồ sơ tháng 12" → bấm lại | Về danh sách chờ, báo cáo đã rời danh sách | UC 4.3 |

## 5. Bổ sung và thẩm định vòng 2 — `dm_xb`, `td_skhcn`

**Ý nêu bật:** mỗi vòng thẩm định lưu một bản ghi; tệp cũ không bị xóa; ngày gửi không bị ghi đè (BR05, BR07, BR09).

| Bước | Thao tác | Kết quả | Chứng minh |
|---|---|---|---|
| 5.1 | Cửa sổ ẩn danh (`dm_xb`): tải lại trang → **Thông báo** | Thông báo "chỉ số CS11 cần bổ sung. Nhận xét: …" | BR15 |
| 5.2 | Kỳ quý 4 → CS11 → **Nhập** | Trạng thái **Cần bổ sung**, khung vàng hiện nhận xét của chuyên viên, có bảng Lịch sử thẩm định vòng 1 | UC 3.4 |
| 5.3 | Tệp cũ → **Đánh dấu thay thế** | Tệp chuyển **Đã thay thế**, vẫn nằm trong bảng và vẫn tải về được | BR05 |
| 5.4 | Tải tệp PDF thứ hai lên, sửa giá trị thành 66 → **Gửi lại** | CS11 về **Chờ thẩm định** | UC 3.4 |
| 5.5 | Cửa sổ thường (`td_skhcn`): **Làm mới** danh sách chờ | Dòng CS11 ghi "Gửi lại (vòng 2)"; cột Gửi lần đầu vẫn là thời điểm gửi ban đầu | BR07: NgayGui ghi một lần |
| 5.6 | **Thẩm định** → bấm **Đạt** | Báo cáo rời danh sách | RB17 |
| 5.7 | Menu **Lịch sử thẩm định** | Hai dòng cho CS11: vòng 1 Chưa đạt, vòng 2 Đạt | BR09, RB10 |

Câu nói gợi ý: "Trễ hạn tính theo lần gửi đầu. Đơn vị không bị coi là nộp trễ chỉ vì phải bổ sung theo yêu cầu thẩm định."

## 6. Gia hạn — `chutri`

**Ý nêu bật:** chỉ gia hạn khi chưa quá hạn, để báo cáo đã trễ không thể được biến thành đúng hạn về sau (BR16, BR22, RB18).

| Bước | Thao tác | Kết quả | Chứng minh |
|---|---|---|---|
| 6.1 | Đăng nhập `chutri` → **Kỳ đánh giá** → Kỳ quý 4 năm 2026 → dòng UBND Đặc khu C → **Gia hạn** | Hộp thoại ghi hạn hiện hành 10/01/2027 và giới hạn ngày chốt 31/01/2027 | UC 2.3 |
| 6.2 | Chọn 15/01/2027 → Gia hạn | Dòng Đặc khu C ghi 15/01/2027 "(đã gia hạn)"; các đơn vị khác giữ nguyên | BR16: gia hạn theo từng lượt giao |
| 6.3 | Gia hạn lần nữa → 20/01/2027 | Được | BR22: gia hạn nhiều lần |
| 6.4 | Quay lại danh sách → mở **Kỳ quý 3 năm 2026** | Mọi dòng có nhãn **Quá hạn**, không có nút Gia hạn | RB18 |

## 7. Theo dõi tiến độ và chậm hạn — `chutri`, `lanhdao`

**Ý nêu bật:** cơ quan chủ trì biết ngay đơn vị nào chưa nộp, báo cáo nào đang chờ, thay vì dò trong thư và tệp (mục 2.1.3).

| Bước | Thao tác | Kết quả | Chứng minh |
|---|---|---|---|
| 7.1 | Vẫn ở trang **Kỳ quý 3 năm 2026** | Sở Nội vụ: Gửi trễ 4 (chữ đỏ). UBND Đặc khu C: Chưa gửi 2 (chữ đỏ). Sở Y tế: Chờ thẩm định 2 | UC 5.1, BR07 |
| 7.2 | Cửa sổ ẩn danh: đăng nhập `lanhdao` → **Tiến độ các kỳ** → Kỳ quý 3 | Cùng bảng tiến độ, không có nút thao tác | Lãnh đạo chỉ xem (Bảng 2.2) |

## 8. Chốt kỳ — `chutri`

**Ý nêu bật:** điểm và hạng do hệ thống tính theo công thức của bộ chỉ số, một lần, trong một giao dịch (BR10, BR11, BR12).

| Bước | Thao tác | Kết quả | Chứng minh |
|---|---|---|---|
| 8.1 | Mở Kỳ quý 4 năm 2026 → **Chốt kỳ** | Không chốt được: còn 6 đơn vị chưa qua hạn hiện hành → Hủy | UC 2.4 bước 2a |
| 8.2 | Mở Kỳ quý 3 năm 2026 → **Chốt kỳ** | Thống kê: 6 đơn vị, Đạt 14, Chờ thẩm định 7, Cần bổ sung 1, Chưa gửi 2. Cảnh báo các chỉ số này tính 0 điểm | UC 2.4 bước 3, 3a |
| 8.3 | **Xác nhận chốt kỳ** | Chuyển sang trang kết quả | BR10 |
| 8.4 | Đọc bảng xếp hạng theo loại | Sở: KH&CN 99,17 – Y tế 33,75 – Nội vụ 30. Xã: Phường A 100 – Xã B 20 – Đặc khu C 12,5 | BR12 |
| 8.5 | Sở Khoa học và Công nghệ → **Điểm chi tiết** | Chỉ 3 nhóm có chỉ số quý; trọng số áp dụng 60%; N6 đạt 29,5 ÷ 30 | BR02: chia lại trọng số; BR04 |
| 8.6 | UBND Đặc khu C → **Điểm chi tiết** | CS10 đang Chờ thẩm định: 0 điểm. CS11, CS12 không nộp: 0 điểm | BR10 |
| 8.7 | Cửa sổ ẩn danh: đăng nhập `dm_xb` → Báo cáo của đơn vị → Kỳ quý 3 | Thông báo kỳ đã chốt, dữ liệu khóa; mọi chỉ số chỉ còn nút Xem | RB19 |

Cách tự kiểm 99,17: N4 = 10/10, N5 = 10/10, N6 = (78 ÷ 80 × 20 + 10) ÷ 30 = 29,5/30. Tổng = (15 + 15 + 29,5) ÷ 60 × 100 = 99,17.

## 9. Kết quả kỳ năm, đối chiếu Phụ lục B — `chutri`, `dm_xb`

**Ý nêu bật:** phần mềm ra đúng con số ví dụ trong báo cáo.

| Bước | Thao tác | Kết quả | Chứng minh |
|---|---|---|---|
| 9.1 | `chutri`: **Kết quả, xếp hạng** → chọn **Kỳ năm 2025** | UBND Xã B: **81,76** điểm, mức Tốt | Mục 2.3.3 |
| 9.2 | UBND Xã B → **Điểm chi tiết** | Bảng nhóm: 18÷20, 20,5÷25, 9,2÷15, 5÷5, 16÷20; trọng số áp dụng 85%. Bảng chỉ số: CS04 10,5/15, CS05 9,2/10, CS06 0/5 | Khớp Bảng B.2 và B.3 |
| 9.3 | Bấm tab **Bảng tổng hợp chung** | Một bảng gộp cả sở và xã, có cột hạng chung | BR12 |
| 9.4 | Cửa sổ ẩn danh (`dm_xb`): **Kết quả, xếp hạng** → Kỳ năm 2025 | Thấy tổng điểm và hạng của mọi đơn vị, nhưng nút Điểm chi tiết chỉ có ở dòng UBND Xã B | BR19: điểm tổng và hạng công khai, chi tiết thì không |

## 10. Quản trị hệ thống — `admin`

**Ý nêu bật:** tách danh mục kỹ thuật cho quản trị hệ thống; nhật ký không sửa, không xóa (BR20, BR24).

| Bước | Thao tác | Kết quả | Chứng minh |
|---|---|---|---|
| 10.1 | Đăng nhập `admin` | Menu chỉ có Tài khoản và Nhật ký, không có số liệu nghiệp vụ | Quyền theo vai trò (mục 2.3.1) |
| 10.2 | **Tạo tài khoản**: điền họ tên, tên đăng nhập, mật khẩu; vai trò Cán bộ đầu mối, để trống đơn vị → Lưu | Bị chặn: đầu mối phải thuộc một đơn vị | RB15 |
| 10.3 | Chọn đơn vị, điền đủ → Lưu. Sau đó **Sửa** tài khoản vừa tạo → Trạng thái Khóa | Tài khoản chuyển Đã khóa; không có nút xóa | BR24, UC 1.1 |
| 10.4 | Menu **Nhật ký** | Thấy các dòng vừa phát sinh: `MO_KY`, `GUI_BAO_CAO`, `KET_LUAN_THAM_DINH`, `GUI_LAI_BAO_CAO`, `GIA_HAN`, `CHOT_KY`. Không có nút sửa hay xóa | BR20, UC 1.3 |

## 11. Danh mục đã dùng thì không xóa — `chutri`

| Bước | Thao tác | Kết quả | Chứng minh |
|---|---|---|---|
| 11.1 | Menu **Đơn vị** → UBND Xã B → **Xóa** | Bị chặn: đơn vị đã được giao vào kỳ | BR24 |
| 11.2 | Menu **Loại minh chứng** → "Văn bản, quyết định" → **Xóa** | Bị chặn: loại đã được dùng | BR24 |

## Bản rút gọn 5 phút

Nếu thời gian ngắn, làm theo thứ tự này:

1. Mục 9, bước 9.1–9.2: Xã B ra 81,76 điểm, khớp Phụ lục B.
2. Mục 3, bước 3.4–3.7: lưu nháp chỉ cảnh báo, gửi thì chặn, rồi gửi thành công.
3. Mục 4, bước 4.1–4.2 và 4.4–4.5: không tự thẩm định đơn vị mình; Chưa đạt phải có nhận xét.
4. Mục 8, bước 8.2–8.5: chốt kỳ quý 3, xem xếp hạng và điểm chi tiết.
5. Mục 1, bước 1.1: bộ chỉ số đã ban hành bị khóa.

## Câu hỏi hay gặp khi bảo vệ

| Câu hỏi | Trả lời ngắn | Chỉ vào đâu |
|---|---|---|
| Đổi công thức thì kết quả cũ có đổi không? | Không. Bộ đã ban hành bị khóa, kỳ trỏ tới bộ đã dùng | Mục 1 |
| Chuyên viên có tự chấm cho đơn vị mình được không? | Không. Chặn ở ba chỗ: lọc danh sách, mở báo cáo, kết luận | Mục 4; `services/baocao.js` hàm `yeuCauKhacDonVi` |
| Đơn vị nộp trễ có bị trừ điểm không? | Không, chỉ thống kê và cảnh báo | Mục 7 |
| Sao điểm từng chỉ số không lưu trong CSDL? | Tính khi cần từ số liệu và công thức; chỉ lưu tổng điểm, hạng, mức độ lúc chốt | Mục 8.5; `lib/scoring.js` |
| Xã không có chỉ số nhóm An toàn thông tin thì có thiệt không? | Không. Trọng số các nhóm còn lại chia lại cho đủ 100% | Mục 9.2 (85%) |
| Chốt kỳ giữa chừng bị lỗi thì sao? | Toàn bộ nằm trong một giao dịch, lỗi thì hoàn tác hết | `services/ky.js` hàm `chotKy` |

## Chưa có trong bản này

Nhập tài khoản bằng Excel (UC 1.2), so sánh các kỳ (UC 5.2), biểu đồ dashboard và xuất tệp (UC 5.3). Nếu được hỏi, nói rõ đây là phần của đợt 2.
