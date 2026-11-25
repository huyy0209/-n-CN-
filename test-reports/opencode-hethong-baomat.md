# Báo cáo kiểm thử — Hệ thống, xác thực, phân quyền, bảo mật API (opencode)

- Dự án: IS028 — Hệ thống theo dõi chỉ số chuyển đổi số (Node/Express + Knex, SQLite khi test)
- Worker: `opencode`
- Phạm vi file nguồn: `server/src/routes/hethong.js`, `server/src/middleware/auth.js`, toàn bộ route có kiểm quyền trong `server/src/routes/*.js`
- File test: `server/test/hethong-baomat.test.js`
- Ngày chạy: 2026-11-25

## 1. Phạm vi đã test

Test ở mức HTTP: dựng app Express thật từ `server/src/app.js` (app đã export sẵn) và `app.listen(0)` trên
SQLite tạm `os.tmpdir()/is028-hethong-<pid>.sqlite` (`taoBang` + `seed`), gọi bằng `fetch` của Node.
Không sửa bất kỳ file nào trong `server/src`, `client/src`, `package.json` hay test có sẵn.

| Nhóm | Nội dung đã kiểm |
|---|---|
| Đăng nhập | Đúng nhận JWT; sai mật khẩu / sai tài khoản cùng thông báo (không lộ tài khoản tồn tại); tài khoản bị khóa trả 401 |
| `/auth/me` + JWT | Token hợp lệ; thiếu token, token rác, hết hạn, giả chữ ký, `alg: none`, `MaND` không tồn tại đều 401; khóa tài khoản giữa phiên thì token cũ mất quyền ngay |
| Đổi mật khẩu | Sai mật khẩu cũ → 422; mật khẩu mới yếu (<6) → 422; đổi xong đăng nhập bằng mật khẩu mới, mật khẩu cũ hết hiệu lực |
| Ma trận phân quyền | 5 vai trò (QUAN_TRI, CHU_TRI, LANH_DAO, DAU_MOI, THAM_DINH) gọi 15 route ngoài quyền → tất cả 401/403; kiểm ngược vai trò đúng vẫn truy cập được |
| BR18 | Chuyên viên thẩm định không kết luận được báo cáo của đơn vị mình (403); đơn vị khác không bị luật này chặn |
| IDOR | Đầu mối Phường A không đọc/sửa/gửi/tải: chi tiết báo cáo, danh sách chỉ số, điểm chi tiết, minh chứng, thay thế minh chứng, tải minh chứng lên báo cáo của Xã B (đều 403); Xã B tự truy cập được |
| Người dùng | Tạo trùng tên đăng nhập → 409; vai trò/đơn vị không hợp lệ hoặc thiếu đơn vị bắt buộc → 422; tạo mới → 201, mật khẩu được băm; sửa vai trò cập nhật đúng + ghi nhật ký; admin không tự bỏ quyền/tự khóa |
| Nhật ký | Ghi nhận thao tác tạo/sửa tài khoản; không có API sửa/xóa bản ghi (PUT trả 404, bản ghi giữ nguyên) |
| Nhập Excel | Dòng hợp lệ được tạo, dòng lỗi (trùng tên có sẵn, trùng trong tệp, sai vai trò, mật khẩu yếu) bị liệt kê; từ chối sai đuôi `.txt`; từ chối `.xlsx` có nội dung rác; từ chối khi chưa chọn tệp |
| Thông báo | Mỗi người chỉ thấy thông báo của mình; `doc-tat-ca` không đánh dấu đọc thông báo của người khác |
| Rò rỉ dữ liệu | Response không chứa hash bcrypt/`MatKhau`; lỗi 500 trả thông báo chung, không lộ stack/`node_modules`/loại lỗi nội bộ |

## 2. Kết quả tổng quan

- Tổng số test: **15**
- Pass: **14**
- Fail: **1** (fail có chủ đích — ghi nhận lỗi ứng dụng, xem mục 3)
- Thời gian chạy: ~14,5 giây

## 3. Danh sách lỗi phát hiện

### LỖI-01 — Dữ liệu sai kiểu ở `MaDV` gây lỗi máy chủ 500 thay vì 422 (mức độ: Thấp)

- **Test:** `BUG: MaDV sai kiểu phải bị từ chối 422 thay vì lỗi máy chủ 500`
- **Loại:** Kiểm tra dữ liệu đầu vào / độ bền vững API (robustness). Không rò rỉ stack, nhưng 500 cho input sai kiểu và có thể bị lạm dụng để làm rác log lỗi.
- **Các bước tái hiện:**
  1. Đăng nhập `admin`, lấy JWT.
  2. `POST /api/nguoidung` với header `Authorization: Bearer <token>` và body:
     ```json
     { "HoTen": "Kiểu Sai", "TenDangNhap": "u_kieu_sai", "MatKhau": "123456", "MaVaiTro": "DAU_MOI", "MaDV": { "x": 1 } }
     ```
  3. Quan sát mã HTTP và body trả về.
- **Kết quả mong đợi:** `422` cùng thông báo kiểm tra dữ liệu (MaDV phải là số/khóa đơn vị hợp lệ), giống các trường hợp sai vai trò/đơn vị khác.
- **Kết quả thực tế:** `500` với body `{ "message": "Lỗi máy chủ. Hãy thử lại." }`. Nguyên nhân: giá trị `MaDV` kiểu object được đẩy thẳng xuống truy vấn
  `db('DONVI').where({ MaDV: d.MaDV })`, driver SQLite ném `TypeError` (không phải `Loi` nghiệp vụ) nên rơi vào nhánh lỗi chung của `app.js`.
- **File:dòng nghi ngờ:** `server/src/routes/hethong.js:59` (hàm `kiemTraTaiKhoan`, kiểm tra đơn vị) — thiếu chuẩn hóa/kiểm tra kiểu cho `MaDV` trước khi truy vấn; có thể bổ sung `Number(d.MaDV)`/kiểm tra `Number.isInteger` và trả `Loi(422, ...)`.
- **Mã liên quan:** UC 1.1 (Quản lý tài khoản và phân quyền), RB14/RB15 (ràng buộc vai trò–đơn vị), RB20 (nhật ký).
- **Đánh giá:** Không phải lỗ hổng xác thực/phân quyền; là lỗi xử lý đầu vào. Mức độ Thấp vì thông báo 500 không lộ chi tiết, nhưng nên trả 4xx đúng bản chất.

### Quan sát thêm (chưa đủ cơ sở để coi là lỗi theo BR, khuyến nghị cải thiện)

1. **Khóa JWT dự phòng cố định** — `server/src/middleware/auth.js:6`: nếu thiếu biến môi trường `JWT_SECRET`, hệ thống dùng khóa mặc định công khai `dev-secret-doi-truoc-khi-dung-that` và chỉ in cảnh báo. Khi triển khai thật mà quên đặt biến, kẻ tấn công có thể tự ký token. Khuyến nghị: từ chối khởi động (fail-fast) nếu thiếu `JWT_SECRET` ở môi trường production.
2. **Không giới hạn số lần đăng nhập sai** — `server/src/routes/hethong.js:13`: không có rate-limit/lockout tạm thời. Rủi ro brute-force mật khẩu yếu (mật khẩu mẫu `123456`). Khuyến nghị thêm đếm số lần sai theo tài khoản/IP.
3. **Đổi mật khẩu không thu hồi token cũ** — `server/src/routes/hethong.js:24`: token phát hành trước khi đổi mật khẩu vẫn dùng được đến khi hết hạn (8 giờ). Không trái BR nhưng nên cân nhắc thu hồi khi đổi mật khẩu.
4. **Admin bị chặn xem chi tiết báo cáo/điểm** — `server/src/nghiepvu.js:85` và `:149`: QUAN_TRI nhận 403 khi xem chi tiết báo cáo/điểm. Đây là chủ đích "least privilege" của mã hiện tại, không phải lỗi bảo mật; ghi nhận để đối chiếu yêu cầu nghiệp vụ.

## 4. Kết luận nhanh

- Xác thực JWT và phân quyền theo vai trò hoạt động đúng: mọi tổ hợp vai trò × route ngoài quyền đều bị chặn 401/403; tài khoản bị khóa mất quyền ngay cả khi token còn hạn.
- Chống IDOR giữa các đơn vị đạt: đầu mối đơn vị khác không đọc/sửa/gửi/tải được báo cáo, điểm, minh chứng; không tạo được minh chứng vào báo cáo đơn vị khác.
- Không rò rỉ hash mật khẩu; lỗi 500 không lộ stack trace hay chi tiết nội bộ.
- 1 lỗi mức Thấp về kiểm tra kiểu `MaDV` gây 500 (LỖI-01); 4 khuyến nghị cải thiện bảo mật ở mục 3.

## 5. Lệnh chạy test và output cuối

Lệnh: `cd server && node --test test/hethong-baomat.test.js`

```text
✔ đăng nhập: đúng nhận token; sai mật khẩu, sai tài khoản, tài khoản khóa đều 401 (8238.2339ms)
✔ /auth/me + JWT: hợp lệ được, thiếu/sai/hết hạn/giả chữ ký/alg none/tài khoản không tồn tại đều 401 (54.7526ms)
✔ khóa tài khoản giữa phiên: token cũ mất quyền ngay lập tức (31.8062ms)
✔ đổi mật khẩu: sai mật khẩu cũ 422, mật khẩu mới yếu 422, đổi xong đăng nhập bằng mật khẩu mới (466.8224ms)
✔ ma trận phân quyền: mỗi vai trò gọi route ngoài quyền đều bị 401/403 (474.8456ms)
✔ ma trận phân quyền: vai trò đúng vẫn truy cập được (không chặn nhầm) (359.5822ms)
✔ IDOR: đầu mối đơn vị A không đọc/sửa/gửi/tải dữ liệu của đơn vị B (204.2208ms)
✔ chuyên viên không được thẩm định báo cáo của đơn vị mình (BR18) (35.9274ms)
✔ tạo người dùng: trùng tên đăng nhập 409; vai trò/đơn vị không hợp lệ 422; tạo mới 201 và ghi nhật ký (221.7762ms)
✔ sửa vai trò người dùng: cập nhật đúng và ghi nhật ký; admin không tự bỏ quyền quản trị (43.018ms)
✔ nhập tài khoản Excel: dòng hợp lệ được tạo, dòng lỗi bị liệt kê; tệp không phải .xlsx bị chặn (299.001ms)
✔ thông báo: mỗi người chỉ thấy của mình; đọc tất cả không ảnh hưởng người khác (29.8388ms)
✔ không rò rỉ hash mật khẩu trong response (22.7323ms)
✔ lỗi 500 trả thông báo chung, không lộ stack trace / tên bảng / node_modules (9.6071ms)
✖ BUG: MaDV sai kiểu phải bị từ chối 422 thay vì lỗi máy chủ 500 (10.4053ms)
ℹ tests 15
ℹ suites 0
ℹ pass 14
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 14512.1788

✖ failing tests:

test at test\hethong-baomat.test.js:429:1
✖ BUG: MaDV sai kiểu phải bị từ chối 422 thay vì lỗi máy chủ 500 (10.4053ms)
  AssertionError [ERR_ASSERTION]: 500 == 422
      at TestContext.<anonymous> (C:\Users\Admin\orca\workspaces\-n-cn-\Testing\server\test\hethong-baomat.test.js:437:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:5)
      at async Test.processPendingSubtests (node:internal/test_runner/test:974:5) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 500,
    expected: 422,
    operator: '==',
    diff: 'simple'
  }
```

Ghi chú: test fail duy nhất là **cố ý** nhằm ghi nhận LỖI-01; không phải lỗi do test viết sai. Nếu LỖI-01 được sửa (trả 422), test này sẽ pass.
