// Kết nối CSDL bằng Knex. Mặc định SQL Server; SQLite chỉ dùng để chạy thử và test.
require('dotenv').config();
const knex = require('knex');

function taoCauHinh() {
  const client = process.env.DB_CLIENT || 'mssql';
  if (client === 'sqlite') {
    return {
      client: 'better-sqlite3',
      connection: { filename: process.env.SQLITE_FILE || './is028.sqlite' },
      useNullAsDefault: true,
      pool: {
        // SQLite mặc định không kiểm tra khóa ngoại
        afterCreate: (conn, done) => { conn.pragma('foreign_keys = ON'); done(); },
      },
    };
  }
  const options = { encrypt: false, trustServerCertificate: true, enableArithAbort: true };
  if (process.env.DB_INSTANCE) options.instanceName = process.env.DB_INSTANCE;
  return {
    client: 'mssql',
    connection: {
      server: process.env.DB_HOST || 'localhost',
      port: process.env.DB_INSTANCE ? undefined : Number(process.env.DB_PORT || 1433),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'IS028',
      options,
    },
    pool: { min: 0, max: 10 },
  };
}

const db = knex(taoCauHinh());

// Thêm một dòng và trả về khóa chính (dùng được cho cả SQL Server lẫn SQLite)
async function them(trx, bang, dong, khoaChinh) {
  const [kq] = await trx(bang).insert(dong).returning(khoaChinh);
  return typeof kq === 'object' ? kq[khoaChinh] : kq;
}

module.exports = { db, them };
