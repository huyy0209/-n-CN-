# Báo cáo tổng hợp kiểm thử IS028

Ngày 25/11/2026. Năm AI chia nhau kiểm thử qua Orca; mọi số liệu dưới đây do điều phối viên (Claude) chạy lại để xác nhận.

## 1. Phân công và kết quả

| AI | Phạm vi | File test | Kết quả | Báo cáo chi tiết |
|---|---|---|---|---|
| Codex (gpt-6-luna) | Kỳ, giao, gia hạn, báo cáo, minh chứng, thẩm định | `server/test/ky-baocao.test.js` | 10/10 pass, 0 lỗi | `codex-ky-baocao.md` |
| GitHub Copilot | Chốt kỳ, tính điểm, xếp hạng, so sánh, dashboard, xuất Excel | `server/test/ketqua.test.js` | 10/10 pass, 0 lỗi | `copilot-ketqua.md` |
| opencode (DeepSeek V4.1 Flash) | Đăng nhập, JWT, phân quyền, IDOR, người dùng, nhập Excel | `server/test/hethong-baomat.test.js` | 14 pass, 1 fail cố ý (LỖI-01) | `opencode-hethong-baomat.md` |
| Claude (thay Antigravity) | Danh mục, bộ chỉ số, nhóm, chỉ số, mức độ | `server/test/danhmuc.test.js` | 25 pass, 9 todo = 7 lỗi | `claude-danhmuc.md` |
| Claude | Giao diện E2E theo `HUONG_DAN_DEMO.md` trên trình duyệt Orca | (thủ công, 61 ảnh) | 76 ca, 74 đạt; 62/62 bước demo khớp số liệu; 7 lỗi | `claude-ui-e2e.md` |
| Antigravity | (ban đầu: danh mục) | — | Không hoàn thành: máy chủ Gemini báo 503 hai lần | — |

Toàn bộ `npm test`: **91 test — 81 pass, 1 fail (cố ý), 9 todo (cố ý)**. Trước đợt kiểm thử: 22 test.

## 2. Danh sách lỗi (15)

| Mã | Mức độ | Mô tả | Nguồn |
|---|---|---|---|
| UI-01 | **Trung bình** | Minh chứng chỉ kiểm tra đuôi tệp, tệp giả đuôi `.pdf` vẫn được nhận (`routes/nghiepvu.js:161`) | UI |
| LỖI-01 | Thấp | `MaDV` sai kiểu gây 500 thay vì 422 | opencode |
| BUG-07 | Thấp | Thiếu `MaLoaiDV` khi thêm/sửa đơn vị gây 500 | danh mục |
| BUG-05 | Thấp | Loại đơn vị áp dụng không hợp lệ gây 500 | danh mục |
| BUG-06 | Thấp | Mức độ có độ rộng 0 lọt qua kiểm tra | danh mục |
| BUG-01 | Thấp | Không có API thêm/sửa/xóa loại đơn vị | danh mục |
| BUG-02 | Thấp | Không chặn trùng tên đơn vị, loại minh chứng | danh mục |
| BUG-03 | Thấp | Thao tác trên id không tồn tại vẫn báo thành công | danh mục |
| BUG-04 | Thấp | Sao chép bộ với tên toàn khoảng trắng | danh mục |
| UI-02 | Thấp | Thông báo khi để trống form đăng nhập gây hiểu nhầm; trang chặn quyền không có đường quay lại | UI |
| UI-03 | Thấp | So sánh kỳ: đơn vị không có ở kỳ trước bị ghi "Không áp dụng" | UI |
| UI-04 | Thấp | Hộp "Giao đơn vị vào kỳ" còn hiện lỗi BR17 cũ | UI |
| UI-05 | Thấp | Thông báo, nhật ký xếp theo mã tự tăng, không theo thời gian | UI |
| UI-06 | Thấp | Ô chọn hạn mới cho phép chọn đúng hạn hiện hành | UI |
| UI-07 | Thấp | Bảng so sánh từng chỉ số hiển thị không thống nhất | UI |

Không có lỗi nghiêm trọng. Luồng chính (tính điểm, chốt kỳ, phân quyền, IDOR, xuất Excel) không có lỗi.

Nhóm nguyên nhân chung: thiếu kiểm tra kiểu và tồn tại dữ liệu đầu vào ở tầng route (LỖI-01, BUG-03, BUG-05, BUG-07), nên sửa một lần bằng hàm kiểm tra dùng chung.

## 3. Thay đổi môi trường

- `server/package.json`, `server/package-lock.json`: `better-sqlite3` 11.x → 13.2.0 để chạy trên Node 26 (bản cũ không biên dịch được).
- Test mới và báo cáo: `server/test/*.test.js` (4 file), `test-reports/`. Chưa commit.
