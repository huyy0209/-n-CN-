// Test nâng cấp CSDL tạo từ bản cũ (GIAODONVI/MaGiao, THAMDINH/MaTD) sang tên thực thể mới
// (HOSODANHGIA/MaHS, PHIEUTHAMDINH/MaPhieuTD) mà không mất dữ liệu và khóa ngoại vẫn đúng.
const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const fs = require('fs');
const knex = require('knex');
const { nangCap } = require('../src/schema');

const tepDb = path.join(os.tmpdir(), `is028-nangcap-${process.pid}.sqlite`);
const db = knex({
  client: 'better-sqlite3',
  connection: { filename: tepDb },
  useNullAsDefault: true,
  pool: { afterCreate: (conn, done) => { conn.pragma('foreign_keys = ON'); done(); } },
});

test.after(async () => { await db.destroy(); fs.rmSync(tepDb, { force: true }); });

test('nâng cấp CSDL cũ: đổi tên bảng, khóa và giữ dữ liệu', async () => {
  // Dựng phần lược đồ cũ liên quan (rút gọn cột)
  await db.schema.createTable('KYDANHGIA', (t) => { t.increments('MaKy'); });
  await db.schema.createTable('GIAODONVI', (t) => {
    t.increments('MaGiao');
    t.integer('MaKy').unsigned().notNullable().references('MaKy').inTable('KYDANHGIA');
  });
  await db.schema.createTable('BAOCAOSOLIEU', (t) => {
    t.increments('MaBC');
    t.integer('MaGiao').unsigned().notNullable().references('MaGiao').inTable('GIAODONVI');
  });
  await db.schema.createTable('THAMDINH', (t) => {
    t.increments('MaTD');
    t.string('KetLuan', 20).notNullable();
    t.integer('MaBC').unsigned().notNullable().references('MaBC').inTable('BAOCAOSOLIEU');
  });
  await db.schema.createTable('KETQUADANHGIA', (t) => {
    t.increments('MaKQ');
    t.integer('MaGiao').unsigned().notNullable().unique().references('MaGiao').inTable('GIAODONVI');
  });
  await db('KYDANHGIA').insert({ MaKy: 1 });
  await db('GIAODONVI').insert({ MaGiao: 7, MaKy: 1 });
  await db('BAOCAOSOLIEU').insert({ MaBC: 3, MaGiao: 7 });
  await db('THAMDINH').insert({ MaTD: 5, KetLuan: 'DAT', MaBC: 3 });
  await db('KETQUADANHGIA').insert({ MaKQ: 1, MaGiao: 7 });

  assert.equal(await nangCap(db), 2);
  assert.equal(await db.schema.hasTable('GIAODONVI'), false);
  assert.equal(await db.schema.hasTable('THAMDINH'), false);
  assert.deepEqual(await db('HOSODANHGIA').select('MaHS', 'MaKy'), [{ MaHS: 7, MaKy: 1 }]);
  assert.deepEqual(await db('PHIEUTHAMDINH').select('MaPhieuTD', 'MaBC'), [{ MaPhieuTD: 5, MaBC: 3 }]);
  assert.deepEqual(await db('BAOCAOSOLIEU').select('MaHS'), [{ MaHS: 7 }]);
  assert.deepEqual(await db('KETQUADANHGIA').select('MaHS'), [{ MaHS: 7 }]);

  // Khóa ngoại trỏ theo tên mới và vẫn chặn dữ liệu sai
  const fk = await db.raw('PRAGMA foreign_key_list(BAOCAOSOLIEU)');
  assert.deepEqual(fk.map((r) => [r.table, r.from, r.to]), [['HOSODANHGIA', 'MaHS', 'MaHS']]);
  await assert.rejects(db('BAOCAOSOLIEU').insert({ MaBC: 4, MaHS: 99 }));

  // Chạy lại không làm gì thêm
  assert.equal(await nangCap(db), 0);
});
