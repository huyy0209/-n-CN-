// Nhóm Use Case 2 - Kỳ đánh giá: mở kỳ, giao đơn vị, gia hạn, chốt kỳ; và theo dõi tiến độ (5.1).
const { them } = require('../db');
const { Loi, ghiNhatKy, guiThongBao, nguoiTheoVaiTro } = require('./common');
const { ymd, cuoiNgayVN, homNayVN, laNgay } = require('../lib/dates');
const { diemChiSo, tinhTongDiem, xepHang, xacDinhMucDo } = require('../lib/scoring');

const ddmmyyyy = (d) => ymd(d).split('-').reverse().join('/');

// Hạn hiện hành của một lượt giao: hạn gia hạn nếu có, không thì hạn nộp của kỳ
function hanHienHanh(ky, giao) {
  return ymd(giao.HanGiaHan || ky.HanNop);
}
const daQuaHan = (ky, giao, now = new Date()) => now > cuoiNgayVN(hanHienHanh(ky, giao));

async function layKy(trx, maKy) {
  const ky = await trx('KYDANHGIA').where({ MaKy: maKy }).first();
  if (!ky) throw new Loi(404, 'Không tìm thấy kỳ đánh giá.');
  return ky;
}

// Chỉ số áp dụng cho một loại đơn vị trong kỳ: thuộc bộ của kỳ, tần suất khớp loại kỳ (RB11, BR03, BR04)
async function chiSoApDung(trx, ky, maLoaiDV) {
  const q = trx('CHISO as c')
    .join('NHOMCHISO as n', 'n.MaNhom', 'c.MaNhom')
    .join('CHISO_LOAIDONVI as l', 'l.MaChiSo', 'c.MaChiSo')
    .where({ 'n.MaBo': ky.MaBo, 'c.TanSuat': ky.LoaiKy })
    .select('c.*', 'n.TenNhom', 'l.MaLoaiDV')
    .orderBy('c.MaChiSo');
  if (maLoaiDV !== undefined) q.where({ 'l.MaLoaiDV': maLoaiDV });
  return q;
}

// Kiểm tra bốn mốc ngày (RB04): NgayBatDau < NgayKetThuc <= HanNop <= NgayChot
function kiemTraMocNgay(d) {
  for (const k of ['NgayBatDau', 'NgayKetThuc', 'HanNop', 'NgayChot']) {
    if (!laNgay(d[k])) throw new Loi(422, `Ngày không hợp lệ: ${k}.`);
  }
  if (!(d.NgayBatDau < d.NgayKetThuc && d.NgayKetThuc <= d.HanNop && d.HanNop <= d.NgayChot)) {
    throw new Loi(422, 'Bốn mốc ngày phải theo thứ tự: ngày bắt đầu < ngày kết thúc ≤ hạn nộp ≤ ngày chốt. (RB04)');
  }
}

// UC 2.1 bước tạo: kỳ được tạo ở trạng thái Nháp, chỉ với bộ đã ban hành (BR14, BR17)
async function taoKy(db, d) {
  return db.transaction(async (trx) => {
    if (!d.TenKy || !['QUY', 'NAM'].includes(d.LoaiKy)) throw new Loi(422, 'Thiếu tên kỳ hoặc loại kỳ.');
    kiemTraMocNgay(d);
    const bo = await trx('BOCHISO').where({ MaBo: d.MaBo }).first();
    if (!bo || bo.TrangThaiBo !== 'BAN_HANH') throw new Loi(422, 'Kỳ chỉ được tạo với bộ chỉ số đã ban hành. (RB13)');
    return them(trx, 'KYDANHGIA', {
      TenKy: d.TenKy, LoaiKy: d.LoaiKy, NgayBatDau: d.NgayBatDau, NgayKetThuc: d.NgayKetThuc,
      HanNop: d.HanNop, NgayChot: d.NgayChot, TrangThaiKy: 'NHAP', MaBo: d.MaBo,
    }, 'MaKy');
  });
}

// UC 2.2 - Giao đơn vị vào kỳ (khi kỳ Nháp hoặc giao bổ sung khi Đang mở)
async function giaoDonVi(db, maKy, dsMaDV, nguoi, now = new Date()) {
  return db.transaction(async (trx) => {
    const ky = await layKy(trx, maKy);
    if (ky.TrangThaiKy === 'DA_CHOT') throw new Loi(409, 'Kỳ đã chốt, không giao thêm đơn vị. (RB19)');
    const daGiao = (await trx('GIAODONVI').where({ MaKy: maKy }).select('MaDV')).map((g) => g.MaDV);
    let soMoi = 0;
    for (const maDV of [...new Set(dsMaDV)]) {
      if (daGiao.includes(maDV)) continue;
      const dv = await trx('DONVI').where({ MaDV: maDV }).first();
      if (!dv) throw new Loi(422, `Đơn vị #${maDV} không tồn tại.`);
      await trx('GIAODONVI').insert({ MaKy: maKy, MaDV: maDV });
      soMoi++;
      if (ky.TrangThaiKy === 'DANG_MO') {
        await guiThongBao(trx, await nguoiTheoVaiTro(trx, 'DAU_MOI', maDV), 'MO_KY',
          `Đơn vị được giao bổ sung vào kỳ "${ky.TenKy}". Hạn nộp: ${ddmmyyyy(ky.HanNop)}.`, now);
      }
    }
    if (soMoi && ky.TrangThaiKy === 'DANG_MO') await ghiNhatKy(trx, nguoi.MaND, 'GIAO_DON_VI', `Kỳ #${maKy}: giao bổ sung ${soMoi} đơn vị`, now);
    return soMoi;
  });
}

// Bỏ lượt giao: chỉ khi kỳ còn Nháp (BR24: đã dùng thì không xóa)
async function boGiao(db, maGiao) {
  return db.transaction(async (trx) => {
    const giao = await trx('GIAODONVI').where({ MaGiao: maGiao }).first();
    if (!giao) throw new Loi(404, 'Không tìm thấy lượt giao.');
    const ky = await layKy(trx, giao.MaKy);
    if (ky.TrangThaiKy !== 'NHAP') throw new Loi(409, 'Chỉ bỏ được lượt giao khi kỳ còn ở trạng thái Nháp.');
    await trx('GIAODONVI').where({ MaGiao: maGiao }).del();
  });
}

// UC 2.1 bước mở: Nháp -> Đang mở, cần ít nhất một lượt giao (BR17)
async function moKy(db, maKy, nguoi, now = new Date()) {
  return db.transaction(async (trx) => {
    const ky = await layKy(trx, maKy);
    if (ky.TrangThaiKy !== 'NHAP') throw new Loi(409, 'Chỉ mở được kỳ đang ở trạng thái Nháp.');
    const bo = await trx('BOCHISO').where({ MaBo: ky.MaBo }).first();
    if (bo.TrangThaiBo !== 'BAN_HANH') throw new Loi(409, 'Bộ chỉ số của kỳ không còn ở trạng thái Ban hành. (RB13)');
    const giaos = await trx('GIAODONVI').where({ MaKy: maKy });
    if (giaos.length === 0) throw new Loi(422, 'Kỳ cần ít nhất một lượt giao đơn vị mới được mở. (BR17)');
    await trx('KYDANHGIA').where({ MaKy: maKy }).update({ TrangThaiKy: 'DANG_MO' });
    for (const g of giaos) {
      await guiThongBao(trx, await nguoiTheoVaiTro(trx, 'DAU_MOI', g.MaDV), 'MO_KY',
        `Kỳ "${ky.TenKy}" đã mở. Hạn nộp báo cáo: ${ddmmyyyy(ky.HanNop)}.`, now);
    }
    await ghiNhatKy(trx, nguoi.MaND, 'MO_KY', `Kỳ #${maKy} - ${ky.TenKy} (${giaos.length} đơn vị)`, now);
  });
}

// UC 2.3 - Gia hạn một lượt giao (BR16, BR22, RB18)
async function giaHan(db, maGiao, hanMoi, nguoi, now = new Date()) {
  return db.transaction(async (trx) => {
    const giao = await trx('GIAODONVI').where({ MaGiao: maGiao }).first();
    if (!giao) throw new Loi(404, 'Không tìm thấy lượt giao.');
    const ky = await layKy(trx, giao.MaKy);
    if (ky.TrangThaiKy !== 'DANG_MO') throw new Loi(409, 'Chỉ gia hạn khi kỳ đang mở.');
    if (!laNgay(hanMoi)) throw new Loi(422, 'Hạn mới không hợp lệ.');
    const hanCu = hanHienHanh(ky, giao);
    if (daQuaHan(ky, giao, now)) throw new Loi(409, `Đã quá hạn hiện hành (${ddmmyyyy(hanCu)}), không gia hạn được. (RB18)`);
    if (!(hanMoi > hanCu)) throw new Loi(422, `Hạn mới phải sau hạn hiện hành (${ddmmyyyy(hanCu)}). (BR22)`);
    if (hanMoi > ymd(ky.NgayChot)) throw new Loi(422, `Hạn mới không được vượt ngày chốt (${ddmmyyyy(ky.NgayChot)}). (RB18)`);
    await trx('GIAODONVI').where({ MaGiao: maGiao }).update({ HanGiaHan: hanMoi });
    const dv = await trx('DONVI').where({ MaDV: giao.MaDV }).first();
    await guiThongBao(trx, await nguoiTheoVaiTro(trx, 'DAU_MOI', giao.MaDV), 'GIA_HAN',
      `Kỳ "${ky.TenKy}": đơn vị được gia hạn nộp báo cáo đến ${ddmmyyyy(hanMoi)}.`, now);
    await ghiNhatKy(trx, nguoi.MaND, 'GIA_HAN', `Kỳ #${ky.MaKy}, ${dv.TenDV}: ${ddmmyyyy(hanCu)} -> ${ddmmyyyy(hanMoi)}`, now);
  });
}

// Tiến độ của kỳ (UC 5.1): theo từng lượt giao, đếm báo cáo theo trạng thái, xác định trễ hạn (BR07)
async function tienDo(trx, maKy, now = new Date()) {
  const ky = await layKy(trx, maKy);
  const giaos = await trx('GIAODONVI as g').join('DONVI as d', 'd.MaDV', 'g.MaDV').join('LOAIDONVI as l', 'l.MaLoaiDV', 'd.MaLoaiDV')
    .where({ 'g.MaKy': maKy }).select('g.*', 'd.TenDV', 'd.MaLoaiDV', 'l.TenLoaiDV').orderBy(['d.MaLoaiDV', 'd.TenDV']);
  const apDung = await chiSoApDung(trx, ky);
  const bcs = await trx('BAOCAOSOLIEU as b').join('GIAODONVI as g', 'g.MaGiao', 'b.MaGiao').where({ 'g.MaKy': maKy }).select('b.*');
  return giaos.map((g) => {
    const han = hanHienHanh(ky, g);
    const hetHan = cuoiNgayVN(han);
    const cs = apDung.filter((c) => c.MaLoaiDV === g.MaLoaiDV);
    const cuaGiao = bcs.filter((b) => b.MaGiao === g.MaGiao && cs.some((c) => c.MaChiSo === b.MaChiSo));
    const dem = (tt) => cuaGiao.filter((b) => b.TrangThaiBC === tt).length;
    const daGui = cuaGiao.filter((b) => b.NgayGui !== null);
    // Trễ: lần gửi đầu sau hạn, hoặc chưa gửi mà đã quá hạn
    const guiTre = daGui.filter((b) => new Date(b.NgayGui) > hetHan).length;
    const chuaGui = cs.length - daGui.length;
    return {
      MaGiao: g.MaGiao, MaDV: g.MaDV, TenDV: g.TenDV, MaLoaiDV: g.MaLoaiDV, TenLoaiDV: g.TenLoaiDV,
      HanHienHanh: han, DaGiaHan: !!g.HanGiaHan, DaQuaHan: now > hetHan,
      SoChiSo: cs.length, Dat: dem('DAT'), ChoThamDinh: dem('CHO_THAM_DINH'), CanBoSung: dem('CAN_BO_SUNG'),
      Nhap: dem('NHAP'), ChuaNop: chuaGui, GuiTre: guiTre, ChuaGuiQuaHan: now > hetHan ? chuaGui : 0,
    };
  });
}

// Tính điểm chi tiết của một lượt giao: điểm từng chỉ số, từng nhóm, tổng điểm.
// Điểm chỉ số và điểm nhóm không lưu, tính khi cần (BR11). Chỉ báo cáo Đạt mới có điểm (BR10).
async function chiTietDiem(trx, maGiao) {
  const giao = await trx('GIAODONVI as g').join('DONVI as d', 'd.MaDV', 'g.MaDV').where({ 'g.MaGiao': maGiao }).select('g.*', 'd.TenDV', 'd.MaLoaiDV').first();
  if (!giao) throw new Loi(404, 'Không tìm thấy lượt giao.');
  const ky = await layKy(trx, giao.MaKy);
  const nhoms = await trx('NHOMCHISO').where({ MaBo: ky.MaBo }).orderBy('MaNhom');
  const cs = await chiSoApDung(trx, ky, giao.MaLoaiDV);
  const maCS = cs.map((c) => c.MaChiSo);
  const bacs = maCS.length ? await trx('BACDIEM').whereIn('MaChiSo', maCS) : [];
  const bcs = await trx('BAOCAOSOLIEU').where({ MaGiao: maGiao });
  return tinhMotGiao(nhoms, cs, bacs, bcs, giao, ky);
}

function tinhMotGiao(nhoms, cs, bacs, bcs, giao, ky) {
  const diemMap = new Map();
  const chiSo = cs.map((c) => {
    const bc = bcs.find((b) => b.MaChiSo === c.MaChiSo);
    const dat = bc && bc.TrangThaiBC === 'DAT';
    const diem = dat ? diemChiSo(c, bacs.filter((b) => b.MaChiSo === c.MaChiSo), bc.GiaTri) : 0;
    diemMap.set(c.MaChiSo, diem);
    return {
      MaChiSo: c.MaChiSo, KyHieu: c.KyHieu, TenChiSo: c.TenChiSo, MaNhom: c.MaNhom, TenNhom: c.TenNhom, KieuCongThuc: c.KieuCongThuc,
      DonViTinh: c.DonViTinh, DiemToiDa: Number(c.DiemToiDa), GiaTri: bc ? (bc.GiaTri === null ? null : Number(bc.GiaTri)) : null,
      TrangThaiBC: bc ? bc.TrangThaiBC : null, Diem: diem,
    };
  });
  const tong = tinhTongDiem(nhoms, cs, diemMap);
  return { MaGiao: giao.MaGiao, MaDV: giao.MaDV, TenDV: giao.TenDV, MaLoaiDV: giao.MaLoaiDV, MaKy: ky.MaKy, TenKy: ky.TenKy, ...tong, ChiSo: chiSo };
}

// UC 2.4 bước 2-3: kiểm tra điều kiện và thống kê trước khi chốt
async function thongKeChot(trx, maKy, now = new Date()) {
  const ky = await layKy(trx, maKy);
  const td = await tienDo(trx, maKy, now);
  const chuaQuaHan = td.filter((g) => !g.DaQuaHan);
  const tong = (k) => td.reduce((s, g) => s + g[k], 0);
  return {
    TrangThaiKy: ky.TrangThaiKy,
    DuDieuKien: ky.TrangThaiKy === 'DANG_MO' && td.length > 0 && chuaQuaHan.length === 0,
    LyDo: ky.TrangThaiKy !== 'DANG_MO' ? 'Kỳ không ở trạng thái Đang mở.'
      : chuaQuaHan.length ? `Còn ${chuaQuaHan.length} đơn vị chưa qua hạn hiện hành (muộn nhất ${ddmmyyyy(chuaQuaHan.map((g) => g.HanHienHanh).sort().pop())}).` : null,
    SoDonVi: td.length, Dat: tong('Dat'), ChoThamDinh: tong('ChoThamDinh'), CanBoSung: tong('CanBoSung'),
    ChuaNop: tong('ChuaNop') + 0, Nhap: tong('Nhap'),
  };
}

// UC 2.4 - Chốt kỳ (BR10, BR11, BR12, RB12, RB19, RB20). Toàn bộ nằm trong một giao dịch: lỗi thì hoàn tác hết.
async function chotKy(db, maKy, nguoi, now = new Date()) {
  return db.transaction(async (trx) => {
    const tk = await thongKeChot(trx, maKy, now);
    if (!tk.DuDieuKien) throw new Loi(409, `Chưa chốt được kỳ. ${tk.LyDo || ''}`);
    const ky = await layKy(trx, maKy);
    const nhoms = await trx('NHOMCHISO').where({ MaBo: ky.MaBo }).orderBy('MaNhom');
    const mucDos = await trx('MUCDOCHUYENDOISO').where({ MaBo: ky.MaBo }); // mức độ cùng bộ với kỳ (RB12)
    const apDung = await chiSoApDung(trx, ky);
    const maCS = [...new Set(apDung.map((c) => c.MaChiSo))];
    const bacs = maCS.length ? await trx('BACDIEM').whereIn('MaChiSo', maCS) : [];
    const giaos = await trx('GIAODONVI as g').join('DONVI as d', 'd.MaDV', 'g.MaDV').where({ 'g.MaKy': maKy }).select('g.*', 'd.TenDV', 'd.MaLoaiDV');
    const bcs = await trx('BAOCAOSOLIEU as b').join('GIAODONVI as g', 'g.MaGiao', 'b.MaGiao').where({ 'g.MaKy': maKy }).select('b.*');

    // Bước 5-7: điểm chỉ số, điểm nhóm, tổng điểm, mức độ
    const kq = giaos.map((g) => {
      const cs = apDung.filter((c) => c.MaLoaiDV === g.MaLoaiDV);
      const t = tinhMotGiao(nhoms, cs, bacs, bcs.filter((b) => b.MaGiao === g.MaGiao), g, ky);
      return { MaGiao: g.MaGiao, MaDV: g.MaDV, MaLoaiDV: g.MaLoaiDV, TongDiem: t.TongDiem, MucDo: xacDinhMucDo(mucDos, t.TongDiem) };
    });
    // Bước 8: xếp hạng chung và theo loại đơn vị, đồng điểm đồng hạng
    const hangChung = xepHang(kq.map((k) => ({ id: k.MaGiao, diem: k.TongDiem })));
    const hangLoai = new Map();
    for (const loai of new Set(kq.map((k) => k.MaLoaiDV))) {
      for (const [id, h] of xepHang(kq.filter((k) => k.MaLoaiDV === loai).map((k) => ({ id: k.MaGiao, diem: k.TongDiem })))) hangLoai.set(id, h);
    }
    // Bước 9: lưu kết quả một lần (RB20)
    for (const k of kq) {
      await trx('KETQUADANHGIA').insert({
        TongDiem: k.TongDiem, HangTheoLoai: hangLoai.get(k.MaGiao), HangChung: hangChung.get(k.MaGiao),
        MaGiao: k.MaGiao, MaMucDo: k.MucDo ? k.MucDo.MaMucDo : null,
      });
    }
    // Bước 10: khóa kỳ. Điều kiện TrangThaiKy chống hai người chốt cùng lúc.
    const soDong = await trx('KYDANHGIA').where({ MaKy: maKy, TrangThaiKy: 'DANG_MO' }).update({ TrangThaiKy: 'DA_CHOT', NgayChot: homNayVN(now) });
    if (soDong !== 1) throw new Loi(409, 'Kỳ vừa được người khác chốt.');
    // Bước 11: thông báo và nhật ký
    for (const g of giaos) {
      await guiThongBao(trx, await nguoiTheoVaiTro(trx, 'DAU_MOI', g.MaDV), 'CHOT_KET_QUA', `Kỳ "${ky.TenKy}" đã chốt. Kết quả và thứ hạng đã được công bố.`, now);
    }
    await guiThongBao(trx, await nguoiTheoVaiTro(trx, 'LANH_DAO'), 'CHOT_KET_QUA', `Kỳ "${ky.TenKy}" đã chốt. Kết quả và thứ hạng đã được công bố.`, now);
    await ghiNhatKy(trx, nguoi.MaND, 'CHOT_KY', `Kỳ #${maKy} - ${ky.TenKy} (${giaos.length} đơn vị)`, now);
    return kq.length;
  });
}

// Bảng kết quả của kỳ đã chốt (công khai sau chốt - BR19)
async function ketQuaKy(trx, maKy) {
  const ky = await layKy(trx, maKy);
  if (ky.TrangThaiKy !== 'DA_CHOT') throw new Loi(409, 'Kỳ chưa chốt nên chưa có kết quả.');
  const ds = await trx('KETQUADANHGIA as k').join('GIAODONVI as g', 'g.MaGiao', 'k.MaGiao').join('DONVI as d', 'd.MaDV', 'g.MaDV')
    .join('LOAIDONVI as l', 'l.MaLoaiDV', 'd.MaLoaiDV').leftJoin('MUCDOCHUYENDOISO as m', 'm.MaMucDo', 'k.MaMucDo')
    .where({ 'g.MaKy': maKy })
    .select('k.MaKQ', 'k.TongDiem', 'k.HangTheoLoai', 'k.HangChung', 'g.MaGiao', 'd.MaDV', 'd.TenDV', 'd.MaLoaiDV', 'l.TenLoaiDV', 'm.TenMucDo')
    .orderBy(['k.HangChung', 'd.TenDV']);
  return { Ky: ky, KetQua: ds.map((x) => ({ ...x, TongDiem: Number(x.TongDiem) })) };
}

// Nhắc hạn tự động (BR15): sắp tới hạn (còn <= 3 ngày) và quá hạn, cho đơn vị còn chỉ số chưa gửi.
// Mỗi nội dung chỉ gửi một lần cho mỗi người.
async function nhacHan(db, now = new Date()) {
  const kys = await db('KYDANHGIA').where({ TrangThaiKy: 'DANG_MO' });
  let soTB = 0;
  for (const ky of kys) {
    for (const g of await tienDo(db, ky.MaKy, now)) {
      if (g.ChuaNop === 0) continue;
      const conLai = (cuoiNgayVN(g.HanHienHanh) - now) / 86400000;
      let loai = null, nd = null;
      if (conLai < 0) { loai = 'QUA_HAN'; nd = `Kỳ "${ky.TenKy}": đã quá hạn ${ddmmyyyy(g.HanHienHanh)}, đơn vị còn ${g.ChuaNop} chỉ số chưa gửi.`; }
      else if (conLai <= 3) { loai = 'SAP_TOI_HAN'; nd = `Kỳ "${ky.TenKy}": sắp tới hạn ${ddmmyyyy(g.HanHienHanh)}, đơn vị còn chỉ số chưa gửi.`; }
      if (!loai) continue;
      for (const maND of await nguoiTheoVaiTro(db, 'DAU_MOI', g.MaDV)) {
        const daGui = await db('THONGBAO').where({ MaND: maND, LoaiTB: loai }).where('NoiDung', 'like', `Kỳ "${ky.TenKy}"%hạn ${ddmmyyyy(g.HanHienHanh)}%`).first();
        if (!daGui) { await guiThongBao(db, [maND], loai, nd, now); soTB++; }
      }
    }
  }
  return soTB;
}

module.exports = { hanHienHanh, daQuaHan, layKy, chiSoApDung, kiemTraMocNgay, taoKy, giaoDonVi, boGiao, moKy, giaHan, tienDo, chiTietDiem, thongKeChot, chotKy, ketQuaKy, nhacHan, ddmmyyyy };
