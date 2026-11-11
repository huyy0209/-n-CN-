// Test logic tính điểm, đối chiếu ví dụ Xã B ở Phụ lục B của báo cáo (81,76 điểm).
const test = require('node:test');
const assert = require('node:assert');
const { diemChiSo, tinhTongDiem, xepHang, xacDinhMucDo } = require('../src/lib/scoring');

test('điểm chỉ số: có/không', () => {
  const cs = { KieuCongThuc: 'CO_KHONG', DiemToiDa: 10 };
  assert.equal(diemChiSo(cs, [], 1), 10);
  assert.equal(diemChiSo(cs, [], 0), 0);
  assert.equal(diemChiSo(cs, [], null), 0);
});

test('điểm chỉ số: tỷ lệ cao tốt, chặn trần', () => {
  const cs = { KieuCongThuc: 'TY_LE', ChieuTot: 'CAO_TOT', ChiTieu: 85, DiemToiDa: 10 };
  assert.equal(diemChiSo(cs, [], 68), 8); // CS13 của Xã B
  assert.equal(diemChiSo(cs, [], 100), 10); // vượt chỉ tiêu vẫn chỉ được điểm tối đa
});

test('điểm chỉ số: tỷ lệ thấp tốt', () => {
  const cs = { KieuCongThuc: 'TY_LE', ChieuTot: 'THAP_TOT', ChiTieu: 5, DiemToiDa: 10 };
  assert.equal(diemChiSo(cs, [], 4), 10);
  assert.equal(diemChiSo(cs, [], 10), 5);
});

test('điểm chỉ số: bậc thang, bậc cuối không giới hạn trên', () => {
  const cs = { KieuCongThuc: 'BAC_THANG', DiemToiDa: 10 };
  const bac = [{ TuGiaTri: 0, DenGiaTri: 0, Diem: 0 }, { TuGiaTri: 1, DenGiaTri: 2, Diem: 5 }, { TuGiaTri: 3, DenGiaTri: 5, Diem: 8 }, { TuGiaTri: 6, DenGiaTri: null, Diem: 10 }];
  assert.equal(diemChiSo(cs, bac, 4), 8); // CS02 của Xã B
  assert.equal(diemChiSo(cs, bac, 0), 0);
  assert.equal(diemChiSo(cs, bac, 60), 10);
});

test('tổng điểm Xã B kỳ năm = 81,76 (nhóm N5 không áp dụng, chia lại trọng số trên 85)', () => {
  const nhoms = [[1, 10], [2, 15], [3, 15], [4, 15], [5, 15], [6, 30]].map(([MaNhom, TrongSo]) => ({ MaNhom, TrongSo }));
  // [mã, nhóm, tối đa, điểm đạt] theo Bảng B.2
  const bang = [[1, 1, 10, 10], [2, 1, 10, 8], [3, 2, 10, 10], [4, 2, 15, 10.5], [5, 3, 10, 9.2], [6, 3, 5, 0], [7, 4, 5, 5], [13, 6, 10, 8], [14, 6, 10, 8]];
  const chiSos = bang.map(([MaChiSo, MaNhom, DiemToiDa]) => ({ MaChiSo, MaNhom, DiemToiDa }));
  const kq = tinhTongDiem(nhoms, chiSos, new Map(bang.map((b) => [b[0], b[3]])));
  assert.equal(kq.TongTrongSo, 85);
  assert.equal(kq.TongDiem, 81.76);
  assert.equal(kq.Nhom.length, 5);
});

test('xếp hạng: đồng điểm đồng hạng', () => {
  const h = xepHang([{ id: 'a', diem: 90 }, { id: 'b', diem: 80 }, { id: 'c', diem: 90 }, { id: 'd', diem: 70 }]);
  assert.deepEqual([h.get('a'), h.get('c'), h.get('b'), h.get('d')], [1, 1, 3, 4]);
});

test('mức độ: biên dưới thuộc mức trên, 100 thuộc mức cao nhất', () => {
  const md = [{ TenMucDo: 'Yếu', DiemTu: 0, DiemDen: 50 }, { TenMucDo: 'Khá', DiemTu: 50, DiemDen: 80 }, { TenMucDo: 'Tốt', DiemTu: 80, DiemDen: 100 }];
  assert.equal(xacDinhMucDo(md, 49.99).TenMucDo, 'Yếu');
  assert.equal(xacDinhMucDo(md, 50).TenMucDo, 'Khá');
  assert.equal(xacDinhMucDo(md, 100).TenMucDo, 'Tốt');
});
