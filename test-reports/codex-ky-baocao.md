# Báo cáo kiểm thử kỳ, báo cáo và thẩm định

## Phạm vi

Đã chạy riêng `server/test/ky-baocao.test.js` trên SQLite tạm, tạo bảng và seed theo mẫu `flow.test.js`. Bao phủ giao và bỏ giao, tạo/sửa/xóa kỳ qua router HTTP và chặn sửa/xóa sau khi mở; RB04 với mọi cặp mốc ngày; gia hạn bị từ chối khi hạn mới không sau hạn hiện hành, chấp nhận đúng ngày chốt, từ chối vượt ngày chốt, gia hạn nhiều lần và sau lần gửi đầu; BR19/RB11; miền giá trị và chỉnh sửa sau gửi; minh chứng bắt buộc, thay thế trước/sau gửi; lịch sử thẩm định và ranh giới trễ hạn BR07.

Kiểm thử multipart mount `routes/nghiepvu.js` vào Express, listen cổng ngẫu nhiên (port 0), dùng `fetch` và `FormData` của Node. Đã xác minh phần mở rộng `.exe` và tệp PDF lớn hơn giới hạn mặc định 10 MB bị từ chối với HTTP 422.

## Kết quả

- Tổng: 10 ca; đạt 10, lỗi 0, todo 0.
- Không phát hiện lỗi ứng dụng trong các ca đã chạy.
- Trong lúc xây dựng, hai ca ban đầu dùng nhầm lượt báo cáo đã seed ở trạng thái không thể sửa. Đã chuyển sang kỳ/lượt giao sạch riêng cho từng luồng; chạy cuối cùng không còn lỗi test.

## Output cuối

Lệnh: `cd server && node --test test/ky-baocao.test.js`

```text
✔ giao lặp không tạo dòng trùng; bỏ giao chỉ hợp lệ ở Nháp và sau đó kỳ có thể mở (UC 2.1/2.2, BR17, BR24)
✔ giao chứa đơn vị không tồn tại rollback toàn bộ lượt hợp lệ đi trước (UC 2.2)
✔ ngoài miền vẫn lưu nháp rồi bị chặn gửi; sửa báo cáo sau gửi bị từ chối (BR21, BR06, RB19)
✔ Chưa đạt cần nhận xét khác khoảng trắng; trả về bổ sung, đầu mối gửi lại rồi lưu đủ hai vòng lịch sử (RB07, BR09)
✔ BR07 phân biệt sát ranh cuối ngày với nộp trễ theo lần gửi đầu; giao bổ sung sau mở không trùng
✔ HTTP: tạo/sửa/xóa kỳ Nháp, RB04 cho mọi cặp mốc và chặn sửa/xóa sau mở
✔ gia hạn: trước hạn hiện hành, bằng ngày chốt, vượt chốt, nối tiếp nhiều lần và sau lần gửi đầu (BR16, BR22, RB18)
✔ BR19 chặn sửa lượt giao khác đơn vị; RB11 chặn chỉ số không áp dụng (BR19, RB11)
✔ minh chứng bắt buộc khi gửi; thay thế giữ lịch sử và không thay được sau khi đã gửi (BR05, RB16)
✔ HTTP multipart: từ chối phần mở rộng sai và vượt giới hạn 10 MB
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
