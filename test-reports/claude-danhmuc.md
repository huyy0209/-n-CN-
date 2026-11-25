# Báo cáo kiểm thử: danh mục và bộ chỉ số (Claude)

- Người thực hiện: Claude (Opus 5.5), thay Antigravity bị lỗi máy chủ
- Ngày: 25/11/2026, nhánh `huyy0209/Testing`
- File test: `server/test/danhmuc.test.js`
- Lệnh chạy: `cd server && node --test test/danhmuc.test.js`

## 1. Phạm vi

Code được kiểm thử: `server/src/routes/danhmuc.js`, `server/src/services/bochiso.js`, cùng `ky.chiSoApDung`/`taoKy` và `scoring.xacDinhMucDo`, vì các quy tắc BR03, BR04, RB09 nằm ở đó.

Cách chạy: giống `flow.test.js`, mỗi lần chạy dùng một SQLite tạm riêng (`os.tmpdir()/is028-danhmuc-<pid>.sqlite`), rồi gọi `taoBang` và `seed`. Phần lớn logic kiểm tra dữ liệu (đơn vị, loại minh chứng, nhóm, chỉ số, mức độ, xóa bộ, ngừng hiệu lực) viết thẳng trong route, nên test dựng `src/app.js` trên `127.0.0.1` ở cổng ngẫu nhiên (port 0, không dùng 4000 hay 5173) và gọi API bằng token JWT thật của tài khoản seed. Các hàm service (`saoChep`, `layBo`, `chiSoApDung`, `xacDinhMucDo`) được gọi trực tiếp. Test không sửa file nào trong `src` hay các test có sẵn.

| Nhóm | Nội dung đã kiểm thử |
|---|---|
| Phân quyền | Chỉ CHU_TRI được ghi danh mục; QUAN_TRI, DAU_MOI, LANH_DAO nhận 403; không có token nhận 401; mọi vai trò đã đăng nhập đều đọc được |
| Loại đơn vị | Danh sách đọc ra; thêm, sửa, xóa qua API |
| Đơn vị | Thêm (có trim tên), thiếu tên, tên chỉ có khoảng trắng, loại sai, thiếu loại, trùng tên; sửa; đổi loại khi đã giao vào kỳ; xóa khi đã giao (BR24), khi còn tài khoản, khi chưa dùng; id không tồn tại |
| Loại minh chứng | Thêm, sửa, xóa; thiếu tên; trùng tên; xóa loại đã dùng (BR24); id không tồn tại |
| Bộ chỉ số | Tạo ở trạng thái Nháp; sửa; xóa bộ Nháp (dọn hết bảng con); xóa bộ Ban hành hoặc Hết hiệu lực bị chặn; sao chép đủ mọi trường và giữ nguyên bộ nguồn (BR14); tên bản sao; id không tồn tại |
| Ban hành | Thành công (trạng thái, ngày, nhật ký); ban hành lại; RB08 với tổng 90, 110, 99,99, 100,01 và tổng lẻ 33,33+33,33+33,34; bộ rỗng; nhóm rỗng; chỉ số chưa áp dụng loại đơn vị; bậc thang thiếu bậc; bậc chồng khoảng (RB09); bậc vượt điểm tối đa |
| Ngừng hiệu lực | Chỉ áp dụng cho bộ Ban hành; còn kỳ Nháp hoặc Đang mở thì chặn; sau khi ngừng không tạo được kỳ, không sửa, không xóa được |
| RB13 | Bộ Ban hành chặn cả 8 thao tác ghi (sửa bộ, thêm/sửa/xóa nhóm, thêm/sửa/xóa chỉ số, ghi mức độ), dữ liệu giữ nguyên |
| Nhóm | Trọng số 0, -5, 100,01, 101, 'abc', '' và null; biên 100 và 0,5; thiếu tên; xóa nhóm còn chỉ số; id không tồn tại |
| Chỉ số | 17 trường hợp tham số công thức sai (RB01, RB05, RB06); kiểu có/không ép miền giá trị 0..1; kiểu tỷ lệ bỏ bậc điểm; gộp loại đơn vị trùng; đổi kiểu thì xóa bậc cũ; xóa chỉ số dọn bảng con; loại đơn vị không tồn tại |
| BR03/BR04 | Tập chỉ số áp dụng theo loại đơn vị × tần suất kỳ trên dữ liệu seed (Sở và Xã, kỳ Năm và kỳ Quý); bộ mới tự dựng có chỉ số Quý chỉ cho Sở |
| Mức độ | Kiểm tra khi lưu (tên trống, từ > đến, số âm, > 100, không phải số; dữ liệu cũ không mất); khi ban hành (chồng lấn, hở, không bắt đầu từ 0 hoặc không đến 100, nhập lộn thứ tự); xếp loại ở biên 0, 49,99, 50, 89,99, 90, 100, 100,01, -0,01; mức có độ rộng 0 |

## 2. Kết quả

| Chỉ số | Số lượng |
|---|---|
| Tổng số test | **34** |
| Pass | **25** |
| Fail ngoài dự kiến | **0** |
| Todo, tức lỗi ứng dụng đã xác nhận và test đang fail có chủ đích | **9** (7 lỗi khác nhau: BUG-02 và BUG-03 mỗi lỗi có 2 test) |

Các test todo được viết theo **kết quả mong đợi**. Khi ứng dụng được sửa đúng, chúng sẽ pass; lúc đó bỏ option `todo` đi.

## 3. Danh sách lỗi

| Mã | Mức độ | Tóm tắt | Liên quan |
|---|---|---|---|
| BUG-07 | **Trung bình** | Thêm hoặc sửa đơn vị mà thiếu `MaLoaiDV` trả 500 thay vì 422 | UC 1.4 |
| BUG-05 | **Trung bình** | Chỉ số có loại đơn vị áp dụng không tồn tại hoặc không phải số trả 500 thay vì 422 | UC 1.5, BR03 |
| BUG-06 | **Trung bình** | Chấp nhận mức độ có độ rộng 0 (`[50;50]`) và vẫn ban hành được; mức này không bao giờ được xếp cho đơn vị nào | UC 1.5, RB06, RB09 |
| BUG-01 | Trung bình (cần nhóm xác nhận yêu cầu) | Không có API thêm, sửa, xóa loại đơn vị | UC 1.4, BR03 |
| BUG-02 | Thấp | Không chặn trùng tên đơn vị và trùng tên loại minh chứng | UC 1.4, UC 1.6 |
| BUG-03 | Thấp | Xóa đơn vị hoặc sửa loại minh chứng với id không tồn tại vẫn trả 200 `{ok:true}` | UC 1.4, UC 1.6 |
| BUG-04 | Thấp | Sao chép bộ với tên chỉ có khoảng trắng lưu nguyên `"   "` | UC 1.5, BR14 |

### BUG-07: thiếu `MaLoaiDV` khi thêm hoặc sửa đơn vị gây lỗi 500
- **Bước tái hiện:** gửi `POST /api/donvi` với body `{ "TenDV": "X" }` (tương tự với `PUT /api/donvi/:id`).
- **Mong đợi:** 422 "Loại đơn vị không hợp lệ."
- **Thực tế:** 500 "Lỗi máy chủ. Hãy thử lại." Log server ghi `Undefined binding(s) detected when compiling FIRST. Undefined column(s): [MaLoaiDV]`.
- **Nghi ngờ:** `server/src/routes/danhmuc.js:23`. `db('LOAIDONVI').where({ MaLoaiDV: b.MaLoaiDV })` gặp giá trị undefined thì knex ném lỗi. Nên kiểm tra `MaLoaiDV` có giá trị trước khi truy vấn.

### BUG-05: loại đơn vị áp dụng không hợp lệ gây lỗi 500
- **Bước tái hiện:** gửi `POST /api/nhom/:id/chiso` (bộ Nháp) với `LoaiDonVi: [9999]` hoặc `LoaiDonVi: ["abc"]`.
- **Mong đợi:** 422 với thông báo loại đơn vị không hợp lệ.
- **Thực tế:** 500, vì vi phạm khóa ngoại hoặc NOT NULL (`Number("abc")` cho ra NaN). Transaction rollback nên dữ liệu không hỏng, nhưng người dùng chỉ nhận thông báo lỗi chung chung.
- **Nghi ngờ:** `server/src/routes/danhmuc.js:170` (`kiemTraChiSo` chỉ gọi `.map(Number)`, không kiểm tra id có tồn tại) và `server/src/services/bochiso.js:127`.

### BUG-06: mức độ có độ rộng 0 lọt qua kiểm tra
- **Bước tái hiện:** với bộ Nháp, gọi `PUT /api/bochiso/:id/mucdo` với `[Thấp 0–50], [Ma 50–50], [Cao 50–100]`, sau đó `POST /api/bochiso/:id/banhanh`.
- **Mong đợi:** bị chặn ở bước lưu hoặc ban hành, vì phải có điểm từ < điểm đến.
- **Thực tế:** lưu được (200) và ban hành được (200). `xacDinhMucDo` dùng điều kiện `tongDiem < DiemDen`, nên mức "Ma" không bao giờ được xếp. Mức này vẫn hiển thị trong bộ và làm sai số mức thống kê.
- **Nghi ngờ:** `server/src/routes/danhmuc.js:197` (điều kiện `DiemTu <= DiemDen`), `server/src/services/bochiso.js:64-71` (kiểm tra nối liền không xét độ rộng), check constraint ở `server/src/schema.js:78`, và `server/src/lib/scoring.js:87`.

### BUG-01: không có API thêm, sửa, xóa loại đơn vị
- **Bước tái hiện:** gửi `POST /api/loaidonvi` với `{ "TenLoaiDV": "Doanh nghiệp nhà nước" }`.
- **Mong đợi** (theo phạm vi được giao: "Đơn vị, loại đơn vị, loại minh chứng: thêm/sửa/xóa"): 201.
- **Thực tế:** 404 "Không tìm thấy API.". Chỉ có `GET /loaidonvi` (`server/src/routes/danhmuc.js:15`). Loại đơn vị chỉ tạo được qua seed.
- **Ghi chú:** nếu đặc tả coi loại đơn vị là danh mục cố định thì đây không phải lỗi. Cần nhóm xác nhận với UC 1.4. Vì chưa có API nên các ca "xóa loại đơn vị đang được dùng" và "trùng tên loại" **chưa kiểm thử được**.

### BUG-02: không chặn trùng tên đơn vị và loại minh chứng
- **Bước tái hiện:** gửi `POST /api/donvi` với `TenDV` trùng "UBND Xã B" và cùng loại; gửi `POST /api/loaiminhchung` với `TenLoaiMC` trùng một loại đã có.
- **Mong đợi:** 409 hoặc 422.
- **Thực tế:** 201, sinh ra hai bản ghi trùng tên. Danh sách chọn đơn vị lúc giao kỳ và danh sách loại minh chứng sẽ hiện hai dòng giống hệt nhau.
- **Nghi ngờ:** `server/src/routes/danhmuc.js:21-25` và `:52-56`. Schema không có ràng buộc unique cho `DONVI.TenDV` và `LOAIMINHCHUNG.TenLoaiMC`. Các bảng này không có cột "mã" do người dùng nhập, nên phần "trùng mã" trong phạm vi chỉ kiểm thử được qua tên.

### BUG-03: thao tác trên id không tồn tại vẫn báo thành công
- **Bước tái hiện:** gửi `DELETE /api/donvi/999999`, hoặc `PUT /api/loaiminhchung/999999` với tên hợp lệ.
- **Mong đợi:** 404.
- **Thực tế:** 200 `{ ok: true }`. Giao diện báo thành công dù không có gì thay đổi (ví dụ khi bản ghi đã bị người khác xóa trước).
- **Nghi ngờ:** `server/src/routes/danhmuc.js:41-47` và `:58-63`. `DELETE /loaiminhchung/:id` cũng có cách xử lý giống vậy. Các route nhóm, chỉ số và bộ đều đã trả 404 đúng.

### BUG-04: sao chép bộ với tên chỉ có khoảng trắng
- **Bước tái hiện:** gửi `POST /api/bochiso/:id/saochep` với `{ "TenBo": "   " }`.
- **Mong đợi:** dùng tên gợi ý "<tên cũ> (bản sao)" hoặc trả 422, giống cách `POST /bochiso` trim và chặn tên trống.
- **Thực tế:** bộ mới có `TenBo = "   "`, hiển thị như một dòng không tên.
- **Nghi ngờ:** `server/src/routes/danhmuc.js:91` và `server/src/services/bochiso.js:90` (`tenMoi || ...` không gọi trim).

## 4. Phần hoạt động đúng
- RB13 khóa đủ 8 thao tác ghi trên bộ Ban hành. Bộ Hết hiệu lực cũng bị khóa sửa và xóa.
- Sao chép (BR14) giữ đúng từng trường của nhóm, chỉ số, bậc điểm, loại đơn vị áp dụng và mức độ, tạo khóa mới và không làm đổi bộ nguồn.
- RB08 dùng sai số 0,001: tổng 99,99 và 100,01 bị chặn, tổng 33,33+33,33+33,34 được chấp nhận.
- RB09 bắt được mức độ chồng lấn, hở, không phủ đủ 0–100, kể cả khi nhập lộn thứ tự. Bậc điểm chồng khoảng (kể cả biên chung và bậc giữa không có cận trên) cũng bị chặn khi ban hành.
- Xếp mức độ ở biên: điểm biên thuộc mức trên, 100 thuộc mức cuối, ngoài 0–100 thì không có mức nào.
- BR03/BR04 đúng như hướng dẫn demo: kỳ Năm thì Sở có CS01–07, CS09, CS15 và Xã có CS01–07, CS13, CS14; kỳ Quý thì cả hai loại đều có CS08, CS10, CS11, CS12.
- Ngừng hiệu lực chặn khi còn kỳ Nháp hoặc Đang mở. Sau khi ngừng, `taoKy` từ chối bộ đó.
- Xóa bộ Nháp dọn hết NHOMCHISO, CHISO, BACDIEM, CHISO_LOAIDONVI và MUCDOCHUYENDOISO.

## 5. Quan sát khác (không tính là lỗi, không có test fail)
- Bậc điểm chồng khoảng và điểm bậc vượt điểm tối đa chỉ bị phát hiện **khi ban hành**, không phải lúc lưu chỉ số. Cách này chấp nhận được, nhưng người dùng nhận lỗi muộn.
- Bậc điểm **hở** (ví dụ `[0;10]`, `[20;∞)`) không bị cảnh báo; giá trị 15 sẽ được 0 điểm. Với chỉ số đếm số nguyên (như seed: `[0;0]`, `[1;2]`) thì khoảng hở là hợp lệ, nên chỉ ghi nhận ở đây.
- Sao chép và ngừng hiệu lực không ghi NHATKY (chỉ ban hành có ghi `BAN_HANH_BO`). Cần đối chiếu BR20 xem có yêu cầu ghi nhật ký cho các thao tác này không.
- SQLite không kiểm tra độ dài chuỗi (`TenDV` 200 ký tự, `TenLoaiMC` 200 ký tự), nên chưa kiểm thử được. Trên SQL Server, tên quá dài nhiều khả năng gây lỗi 500 tương tự BUG-07.

## 6. Output cuối của lệnh chạy test

```
$ cd server && node --test --test-reporter=spec test/danhmuc.test.js
✔ PQ: chỉ Cán bộ chủ trì được ghi danh mục; vai trò khác 403, không token 401
✔ LDV: danh sách loại đơn vị có 2 loại seed
⚠ LDV: thêm/sửa/xóa loại đơn vị qua API # BUG-01: không có API POST/PUT/DELETE /loaidonvi (trả 404)
✔ DV: thêm đơn vị hợp lệ; thiếu tên / tên toàn khoảng trắng / loại sai bị 422
⚠ DV: thiếu MaLoaiDV phải trả 422, không phải 500 # BUG-07: where({ MaLoaiDV: undefined }) -> knex "Undefined binding(s)" -> 500 "Lỗi máy chủ"
⚠ DV: thêm đơn vị trùng tên với đơn vị đã có phải bị chặn # BUG-02: trùng tên đơn vị vẫn tạo thành công (201)
✔ DV: sửa tên được; đổi loại khi đã giao vào kỳ bị 409; đổi loại khi chưa giao được
✔ DV: xóa đơn vị đã giao vào kỳ (BR24) hoặc còn tài khoản bị 409; đơn vị mới xóa được
⚠ DV: xóa đơn vị không tồn tại phải trả 404 # BUG-03: DELETE /donvi/:id với id không tồn tại vẫn trả 200 ok
✔ LMC: thêm, sửa, xóa loại chưa dùng; thiếu tên 422; xóa loại đã dùng 409 (BR24)
⚠ LMC: thêm loại minh chứng trùng tên phải bị chặn # BUG-02: trùng tên loại minh chứng vẫn tạo thành công (201)
⚠ LMC: sửa loại minh chứng không tồn tại phải trả 404 # BUG-03: PUT /loaiminhchung/:id với id không tồn tại trả 200 ok
✔ BCS: tạo bộ ở trạng thái Nháp; thiếu tên 422; sửa bộ Nháp được
✔ BCS: xóa bộ Nháp xóa sạch nhóm, chỉ số, bậc điểm, loại áp dụng, mức độ; bộ Ban hành không xóa được
✔ BCS: sao chép giữ đủ nhóm, chỉ số (mọi trường), bậc điểm, loại đơn vị, mức độ; bộ nguồn không đổi (BR14)
⚠ BCS: sao chép với tên toàn khoảng trắng phải dùng tên gợi ý hoặc bị 422 # BUG-04: saochep lưu TenBo "   " (không trim/kiểm tra như POST /bochiso)
✔ BH: ban hành bộ hợp lệ -> BAN_HANH, có NgayBanHanh, ghi nhật ký; ban hành lại 409
✔ BH: tổng trọng số nhóm khác 100 bị chặn (RB08), kể cả 99,99 và 100,01; tổng lẻ đúng 100 thì đạt
✔ BH: bộ rỗng / nhóm rỗng / chỉ số chưa áp dụng loại đơn vị / bậc thang thiếu bậc đều bị liệt kê lỗi
✔ BH: bậc điểm chồng khoảng (RB09), bậc giữa không có cận trên, điểm bậc vượt điểm tối đa đều bị chặn khi ban hành
✔ NHL: chỉ ngừng được bộ Ban hành; còn kỳ Nháp/Đang mở thì chặn; ngừng xong không tạo kỳ mới, không sửa, không xóa
✔ RB13: bộ Ban hành khóa sửa bộ, thêm/sửa/xóa nhóm, thêm/sửa/xóa chỉ số, ghi mức độ
✔ NHOM: thêm/sửa nhóm; trọng số ≤0, >100, không phải số, thiếu tên bị 422; biên 100 được
✔ NHOM: xóa nhóm còn chỉ số bị 409; nhóm rỗng xóa được
✔ CS: tham số công thức sai bị 422 (RB01, RB05, RB06)
✔ CS: có/không ép miền 0..1, bỏ chỉ tiêu; tỷ lệ bỏ bậc điểm; loại đơn vị trùng được gộp
✔ CS: sửa chỉ số đổi kiểu bậc thang -> tỷ lệ xóa bậc điểm cũ, thay loại áp dụng; xóa chỉ số dọn bảng con
⚠ CS: loại đơn vị áp dụng không tồn tại phải bị 422, không phải lỗi máy chủ 500 # BUG-05: LoaiDonVi [9999] hoặc ["abc"] gây lỗi khóa ngoại/NOT NULL -> 500 "Lỗi máy chủ"
✔ BR03/BR04: tập chỉ số áp dụng theo loại đơn vị và tần suất kỳ (dữ liệu seed)
✔ BR03/BR04: bộ mới với chỉ số chỉ cho Sở, tần suất Quý -> kỳ Quý: Sở có, Xã không; kỳ Năm: không ai có
✔ MD: ghi lại danh sách mức độ; tên trống, từ > đến, âm, > 100, không phải số bị 422 và không xóa dữ liệu cũ
✔ MD: ngưỡng chồng lấn, hở, không bắt đầu từ 0 hoặc không tới 100 bị chặn khi ban hành (RB09)
✔ MD: xếp mức độ tại biên: điểm biên thuộc mức trên, 100 thuộc mức cuối, 0 thuộc mức đầu
⚠ MD: mức độ có độ rộng 0 (điểm từ = điểm đến) phải bị chặn # BUG-06: chấp nhận mức [50;50] và ban hành được; mức đó không bao giờ được xếp (xacDinhMucDo dùng < DiemDen)
ℹ tests 34
ℹ suites 0
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 9
ℹ duration_ms 16188.7
```
Exit code 0. Log `console.error` của server (các lỗi 500 ở BUG-05 và BUG-07) xuất hiện xen giữa output; đó là log từ ứng dụng, không phải lỗi của test.
