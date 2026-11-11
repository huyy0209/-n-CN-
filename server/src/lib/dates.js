// Tiện ích ngày giờ. Hạn tính đến hết ngày 23:59:59 giờ Việt Nam (BR25).

// Chuẩn hóa giá trị ngày đọc từ CSDL (Date, số ms hoặc chuỗi) về đối tượng Date
function thanhDate(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  return new Date(v);
}

// Lấy chuỗi YYYY-MM-DD của một cột kiểu ngày
function ymd(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  return thanhDate(v).toISOString().slice(0, 10);
}

// Thời điểm hết hạn của một ngày: 23:59:59 giờ Việt Nam (UTC+7)
function cuoiNgayVN(ngay) {
  return new Date(`${ymd(ngay)}T23:59:59+07:00`);
}

// Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD
function homNayVN(now = new Date()) {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

// Kiểm tra chuỗi ngày hợp lệ dạng YYYY-MM-DD
function laNgay(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
}

module.exports = { thanhDate, ymd, cuoiNgayVN, homNayVN, laNgay };
