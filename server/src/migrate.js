// Tạo bảng. Chạy: npm run db:migrate   (thêm --reset để xóa hết bảng rồi tạo lại)
const { db } = require('./db');
const { taoBang, xoaBang, nangCap } = require('./schema');

(async () => {
  try {
    if (process.argv.includes('--reset')) {
      await xoaBang(db);
      console.log('Đã xóa các bảng cũ.');
    }
    if (await db.schema.hasTable('BOCHISO')) {
      const soBuoc = await nangCap(db);
      if (soBuoc) console.log('Đã nâng cấp CSDL cũ: GIAODONVI -> HOSODANHGIA, THAMDINH -> PHIEUTHAMDINH (giữ nguyên dữ liệu).');
      else console.log('CSDL đã có bảng. Dùng "npm run db:reset" nếu muốn tạo lại từ đầu.');
    } else {
      await taoBang(db);
      console.log('Đã tạo 19 bảng.');
    }
  } catch (e) {
    console.error('Lỗi tạo bảng:', e.message);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
})();
