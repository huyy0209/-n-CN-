# Báo cáo kiểm thử kết quả, chốt kỳ và xuất Excel

## Phạm vi

Đã thêm `server/test/ketqua.test.js`, kiểm thử trên SQLite tạm theo `process.pid` với `taoBang` và dữ liệu `seed`. Phạm vi gồm:

- Công thức có/không, tỷ lệ cao tốt/thấp tốt, bậc thang, điểm 0/âm/rỗng/rất lớn, chia lại trọng số, làm tròn, xếp hạng đồng điểm và biên mức độ.
- Thống kê trước khi chốt; chặn chốt khi còn hạn; chốt điểm 0 cho báo cáo không ở trạng thái Đạt; khóa dữ liệu và không chốt lại (RB19).
- Kết quả và chi tiết điểm Xã B so với Phụ lục B; so sánh kỳ liền trước, chênh điểm/hạng, đơn vị vắng ở kỳ trước và kỳ đầu không có kỳ trước.
- Dashboard; đọc workbook bằng ExcelJS và đối chiếu đủ bốn sheet Excel, hạng, tổng điểm, trọng số và điểm chỉ số.

## Kết quả

**10 test pass, 0 fail, 0 todo.** Xã B kỳ năm 2025 đạt **81,76 điểm**, mức Tốt; dữ liệu dashboard/Excel đối chiếu khớp kết quả dịch vụ.

**Lỗi ứng dụng ghi nhận:** Không phát hiện lỗi cần báo cáo. Giá trị âm ở chỉ số thấp-tốt cho điểm tối đa nếu gọi trực tiếp `diemChiSo`, nhưng luồng nghiệp vụ hiện cảnh báo và chặn gửi giá trị ngoài miền trước khi báo cáo được chấm; không ghi nhận đường đi hợp lệ để giá trị đó thành Đạt. Giá trị nhập rỗng được lưu thành `null`, không gửi được và không có điểm.

## Lệnh và output cuối

Lệnh chạy đúng theo yêu cầu:

```text
cd server
node --test test/ketqua.test.js
```

Output lần chạy cuối:

```text
✔ công thức có/không và tỷ lệ xử lý 0, âm, rỗng, quá chỉ tiêu
✔ công thức bậc thang tính hai biên, khoảng trống, giá trị âm và bậc không giới hạn
✔ tổng điểm chia lại trọng số nhóm áp dụng và chỉ làm tròn kết quả cuối
✔ xếp hạng đồng điểm và biên các mức độ
✔ giá trị nhập rỗng lưu thành null, không thể gửi và không tạo điểm
✔ kết quả năm 2025 khớp 81,76 điểm của Xã B và Phụ lục B
✔ thống kê chốt trước hạn, chốt điểm chưa Đạt bằng 0 và từ chối chốt lần hai
✔ so sánh kỳ liền trước cùng loại, hạng và đơn vị không có kỳ trước
✔ dashboard trả thống kê mẫu chính xác và không tính nhóm không áp dụng
✔ xuất Excel tạo đủ 4 sheet, cột và số liệu trùng kết quả dịch vụ
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 13304.1848
```
