// Xuất script T-SQL tạo bảng cho SQL Server từ cùng định nghĩa trong schema.js (không cần kết nối CSDL).
// Chạy: npm run db:sql  ->  database/is028_sqlserver.sql
const fs = require('fs');
const path = require('path');
const knex = require('knex')({ client: 'mssql' });
const { DINH_NGHIA } = require('./schema');

const dong = ['-- Script tạo 19 bảng cho SQL Server - sinh tự động từ server/src/schema.js, không sửa tay.', '-- Dùng để đưa vào báo cáo hoặc chạy tay trong SSMS thay cho "npm run db:migrate".', ''];
for (const [ten, ham] of DINH_NGHIA) {
  dong.push(`-- ${ten}`);
  for (const cau of knex.schema.createTable(ten, ham).toSQL()) dong.push(`${cau.sql};`);
  dong.push('');
}
const tep = path.join(__dirname, '..', '..', 'database', 'is028_sqlserver.sql');
fs.mkdirSync(path.dirname(tep), { recursive: true });
fs.writeFileSync(tep, dong.join('\n'));
console.log(`Đã xuất ${tep}`);
knex.destroy();
