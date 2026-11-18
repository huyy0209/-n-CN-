// Nhóm Use Case 3 (báo cáo số liệu, minh chứng) và nhóm 4 (thẩm định).
const { them } = require('../db');
const { Loi, ghiNhatKy, guiThongBao, nguoiTheoVaiTro } = require('./common');
const { layKy, chiSoApDung } = require('./ky');

// Lượt giao kèm kỳ và đơn vị
async function layGiao(trx, maHS) {
  const giao = await trx('HOSODANHGIA as g').join('DONVI as d', 'd.MaDV', 'g.MaDV').where({ 'g.MaHS': maHS }).select('g.*', 'd.TenDV', 'd.MaLoaiDV').first();
  if (!giao) throw new Loi(404, 'Không tìm thấy lượt giao.');
  return { giao, ky: await layKy(trx, giao.MaKy) };
}

// Báo cáo kèm lượt giao, kỳ, chỉ số
async function layBaoCao(trx, maBC) {
  const bc = await trx('BAOCAOSOLIEU').where({ MaBC: maBC }).first();
  if (!bc) throw new Loi(404, 'Không tìm thấy báo cáo số liệu.');
  const { giao, ky } = await layGiao(trx, bc.MaHS);
  const chiSo = await trx('CHISO').where({ MaChiSo: bc.MaChiSo }).first();
  return { bc, giao, ky, chiSo };
}

// Kỳ phải Đang mở mới được thêm/sửa dữ liệu (RB19)
function yeuCauKyMo(ky) {
  if (ky.TrangThaiKy === 'DA_CHOT') throw new Loi(409, 'Kỳ đã chốt, dữ liệu của kỳ đã khóa. (RB19)');
  if (ky.TrangThaiKy !== 'DANG_MO') throw new Loi(409, 'Kỳ chưa mở.');
}

// Cán bộ đầu mối chỉ thao tác trên dữ liệu của đơn vị mình (BR19, RB15)
function yeuCauDonViMinh(nguoi, giao) {
  if (nguoi.MaVaiTro !== 'DAU_MOI' || nguoi.MaDV !== giao.MaDV) throw new Loi(403, 'Bạn chỉ được thao tác trên báo cáo của đơn vị mình. (BR19)');
}

// Báo cáo chỉ sửa được khi Nháp hoặc Cần bổ sung
function yeuCauSuaDuoc(bc) {
  if (!['NHAP', 'CAN_BO_SUNG'].includes(bc.TrangThaiBC)) throw new Loi(409, 'Báo cáo đang chờ thẩm định hoặc đã đạt, không sửa được.');
}

const ngoaiMien = (chiSo, v) => v < Number(chiSo.GiaTriMin) || v > Number(chiSo.GiaTriMax);

// UC 3.1 - Lưu nháp giá trị. Chỉ chặn sai kiểu dữ liệu; ngoài miền vẫn lưu kèm cảnh báo (BR21).
async function luuNhap(db, maHS, maChiSo, giaTri, nguoi) {
  return db.transaction(async (trx) => {
    const { giao, ky } = await layGiao(trx, maHS);
    yeuCauDonViMinh(nguoi, giao);
    yeuCauKyMo(ky);
    const chiSo = (await chiSoApDung(trx, ky, giao.MaLoaiDV)).find((c) => c.MaChiSo === Number(maChiSo));
    if (!chiSo) throw new Loi(422, 'Chỉ số không áp dụng cho đơn vị trong kỳ này. (RB11)');
    let v = null;
    if (giaTri !== null && giaTri !== undefined && giaTri !== '') {
      v = Number(giaTri);
      if (!Number.isFinite(v)) throw new Loi(422, 'Giá trị phải là số.');
    }
    let bc = await trx('BAOCAOSOLIEU').where({ MaHS: maHS, MaChiSo: chiSo.MaChiSo }).first();
    let maBC;
    if (!bc) {
      maBC = await them(trx, 'BAOCAOSOLIEU', { GiaTri: v, TrangThaiBC: 'NHAP', MaHS: maHS, MaChiSo: chiSo.MaChiSo, MaNguoiNhap: nguoi.MaND }, 'MaBC');
    } else {
      yeuCauSuaDuoc(bc);
      maBC = bc.MaBC;
      await trx('BAOCAOSOLIEU').where({ MaBC: maBC }).update({ GiaTri: v, MaNguoiNhap: nguoi.MaND });
    }
    const canhBao = v !== null && ngoaiMien(chiSo, v)
      ? `Giá trị nằm ngoài miền hợp lệ (${Number(chiSo.GiaTriMin)} đến ${Number(chiSo.GiaTriMax)}). Vẫn lưu nháp nhưng sẽ bị chặn khi gửi.` : null;
    return { MaBC: maBC, CanhBao: canhBao };
  });
}

// UC 3.2 - Đính kèm minh chứng (tệp đã được multer kiểm tra định dạng, dung lượng)
async function themMinhChung(db, maBC, tep, maLoaiMC, nguoi, now = new Date()) {
  return db.transaction(async (trx) => {
    const { bc, giao, ky } = await layBaoCao(trx, maBC);
    yeuCauDonViMinh(nguoi, giao);
    yeuCauKyMo(ky);
    yeuCauSuaDuoc(bc);
    const loai = await trx('LOAIMINHCHUNG').where({ MaLoaiMC: maLoaiMC }).first();
    if (!loai) throw new Loi(422, 'Chưa chọn loại minh chứng hợp lệ.');
    return them(trx, 'MINHCHUNG', {
      TenTep: tep.TenTep, DuongDan: tep.DuongDan, DungLuong: tep.DungLuong, NgayTai: now, TrangThaiMC: 'HIEU_LUC', MaBC: maBC, MaLoaiMC: maLoaiMC,
    }, 'MaMC');
  });
}

// Tệp bị thay thế chỉ đánh dấu Đã thay thế, không xóa (BR05)
async function thayTheMinhChung(db, maMC, nguoi) {
  return db.transaction(async (trx) => {
    const mc = await trx('MINHCHUNG').where({ MaMC: maMC }).first();
    if (!mc) throw new Loi(404, 'Không tìm thấy minh chứng.');
    const { bc, giao, ky } = await layBaoCao(trx, mc.MaBC);
    yeuCauDonViMinh(nguoi, giao);
    yeuCauKyMo(ky);
    yeuCauSuaDuoc(bc);
    await trx('MINHCHUNG').where({ MaMC: maMC }).update({ TrangThaiMC: 'DA_THAY_THE' });
  });
}

// UC 3.3 và 3.4 - Gửi / gửi lại báo cáo. Kiểm tra miền giá trị và minh chứng bắt buộc (BR06, RB16).
// NgayGui chỉ ghi ở lần gửi đầu (BR07).
async function guiBaoCao(db, maBC, nguoi, now = new Date()) {
  return db.transaction(async (trx) => {
    const { bc, giao, ky, chiSo } = await layBaoCao(trx, maBC);
    yeuCauDonViMinh(nguoi, giao);
    yeuCauKyMo(ky);
    yeuCauSuaDuoc(bc);
    const loi = [];
    if (bc.GiaTri === null) loi.push('Chưa nhập giá trị.');
    else if (ngoaiMien(chiSo, Number(bc.GiaTri))) loi.push(`Giá trị nằm ngoài miền hợp lệ (${Number(chiSo.GiaTriMin)} đến ${Number(chiSo.GiaTriMax)}).`);
    else if (chiSo.KieuCongThuc === 'CO_KHONG' && ![0, 1].includes(Number(bc.GiaTri))) loi.push('Chỉ số có/không chỉ nhận Có hoặc Không.');
    if (chiSo.BatBuocMinhChung) {
      const mc = await trx('MINHCHUNG').where({ MaBC: maBC, TrangThaiMC: 'HIEU_LUC' }).first();
      if (!mc) loi.push('Chỉ số bắt buộc minh chứng: cần ít nhất một tệp minh chứng còn hiệu lực. (RB16)');
    }
    if (loi.length) throw new Loi(422, 'Báo cáo chưa đủ điều kiện gửi.', loi);
    const cu = bc.TrangThaiBC;
    const capNhat = { TrangThaiBC: 'CHO_THAM_DINH' };
    if (bc.NgayGui === null) capNhat.NgayGui = now; // không ghi đè khi gửi lại
    const soDong = await trx('BAOCAOSOLIEU').where({ MaBC: maBC, TrangThaiBC: cu }).update(capNhat);
    if (soDong !== 1) throw new Loi(409, 'Báo cáo vừa thay đổi trạng thái, hãy tải lại.');
    await ghiNhatKy(trx, nguoi.MaND, cu === 'NHAP' ? 'GUI_BAO_CAO' : 'GUI_LAI_BAO_CAO', `Báo cáo #${maBC}: ${giao.TenDV} - ${chiSo.KyHieu || chiSo.TenChiSo} - ${ky.TenKy}`, now);
  });
}

// Chuyên viên không thẩm định báo cáo của đơn vị mình (BR18, RB14)
function yeuCauKhacDonVi(nguoi, giao) {
  if (nguoi.MaVaiTro !== 'THAM_DINH') throw new Loi(403, 'Chỉ chuyên viên thẩm định mới thực hiện được.');
  if (nguoi.MaDV !== null && nguoi.MaDV === giao.MaDV) throw new Loi(403, 'Chuyên viên không thẩm định báo cáo của đơn vị mình. (BR18)');
}

// UC 4.1 - Danh sách chờ thẩm định, đã lọc bỏ báo cáo của đơn vị mình
async function danhSachCho(trx, nguoi) {
  const q = trx('BAOCAOSOLIEU as b').join('HOSODANHGIA as g', 'g.MaHS', 'b.MaHS').join('KYDANHGIA as k', 'k.MaKy', 'g.MaKy')
    .join('DONVI as d', 'd.MaDV', 'g.MaDV').join('CHISO as c', 'c.MaChiSo', 'b.MaChiSo')
    .where({ 'b.TrangThaiBC': 'CHO_THAM_DINH', 'k.TrangThaiKy': 'DANG_MO' })
    .select('b.MaBC', 'b.GiaTri', 'b.NgayGui', 'k.MaKy', 'k.TenKy', 'd.MaDV', 'd.TenDV', 'c.KyHieu', 'c.TenChiSo', 'c.KieuCongThuc', 'c.DonViTinh')
    .orderBy('b.NgayGui');
  if (nguoi.MaDV !== null) q.whereNot({ 'g.MaDV': nguoi.MaDV });
  const ds = await q;
  // số vòng đã thẩm định để biết báo cáo gửi lần đầu hay gửi lại
  const vong = ds.length ? await trx('PHIEUTHAMDINH').whereIn('MaBC', ds.map((x) => x.MaBC)).select('MaBC').count({ n: '*' }).groupBy('MaBC') : [];
  return ds.map((x) => ({ ...x, GiaTri: Number(x.GiaTri), SoVongDaThamDinh: Number((vong.find((v) => v.MaBC === x.MaBC) || {}).n || 0) }));
}

// UC 4.3 - Kết luận thẩm định. Mỗi lần kết luận tạo một vòng mới (BR09); Chưa đạt bắt buộc nhận xét (RB07).
async function ketLuan(db, maBC, ketLuanTD, nhanXet, nguoi, now = new Date()) {
  return db.transaction(async (trx) => {
    const { bc, giao, ky, chiSo } = await layBaoCao(trx, maBC);
    yeuCauKhacDonVi(nguoi, giao);
    yeuCauKyMo(ky);
    if (!['DAT', 'CHUA_DAT'].includes(ketLuanTD)) throw new Loi(422, 'Kết luận phải là Đạt hoặc Chưa đạt.');
    const nx = (nhanXet || '').trim();
    if (ketLuanTD === 'CHUA_DAT' && !nx) throw new Loi(422, 'Kết luận Chưa đạt bắt buộc có nhận xét. (RB07)');
    // RB17: Đạt khi và chỉ khi vòng cuối kết luận Đạt; Chưa đạt chuyển sang Cần bổ sung.
    // Cập nhật có điều kiện: nếu chuyên viên khác vừa kết luận thì số dòng = 0
    const moi = ketLuanTD === 'DAT' ? 'DAT' : 'CAN_BO_SUNG';
    const soDong = await trx('BAOCAOSOLIEU').where({ MaBC: maBC, TrangThaiBC: 'CHO_THAM_DINH' }).update({ TrangThaiBC: moi });
    if (soDong !== 1) throw new Loi(409, 'Báo cáo không còn ở trạng thái Chờ thẩm định (có thể chuyên viên khác vừa kết luận).');
    const { v } = await trx('PHIEUTHAMDINH').where({ MaBC: maBC }).max({ v: 'VongThamDinh' }).first();
    await trx('PHIEUTHAMDINH').insert({ VongThamDinh: (v || 0) + 1, KetLuan: ketLuanTD, NhanXet: nx || null, NgayThamDinh: now, MaBC: maBC, MaChuyenVien: nguoi.MaND });
    const ten = chiSo.KyHieu || chiSo.TenChiSo;
    const dauMoi = await nguoiTheoVaiTro(trx, 'DAU_MOI', giao.MaDV);
    if (ketLuanTD === 'DAT') await guiThongBao(trx, dauMoi, 'THAM_DINH_XONG', `Kỳ "${ky.TenKy}": chỉ số ${ten} đã được thẩm định Đạt.`, now);
    else await guiThongBao(trx, dauMoi, 'YEU_CAU_BO_SUNG', `Kỳ "${ky.TenKy}": chỉ số ${ten} cần bổ sung. Nhận xét: ${nx}`, now);
    await ghiNhatKy(trx, nguoi.MaND, 'KET_LUAN_THAM_DINH', `Báo cáo #${maBC}: ${giao.TenDV} - ${ten} - ${ketLuanTD === 'DAT' ? 'Đạt' : 'Chưa đạt'}`, now);
  });
}

// Chi tiết một báo cáo: số liệu, minh chứng, các vòng thẩm định (UC 4.2, 4.4)
async function chiTietBaoCao(trx, maBC) {
  const { bc, giao, ky, chiSo } = await layBaoCao(trx, maBC);
  const minhChung = await trx('MINHCHUNG as m').join('LOAIMINHCHUNG as l', 'l.MaLoaiMC', 'm.MaLoaiMC').where({ 'm.MaBC': maBC })
    .select('m.MaMC', 'm.TenTep', 'm.DungLuong', 'm.NgayTai', 'm.TrangThaiMC', 'l.TenLoaiMC').orderBy('m.MaMC');
  const thamDinh = await trx('PHIEUTHAMDINH as t').join('NGUOIDUNG as n', 'n.MaND', 't.MaChuyenVien').where({ 't.MaBC': maBC })
    .select('t.VongThamDinh', 't.KetLuan', 't.NhanXet', 't.NgayThamDinh', 'n.HoTen').orderBy('t.VongThamDinh');
  const bacDiem = await trx('BACDIEM').where({ MaChiSo: chiSo.MaChiSo }).orderBy('TuGiaTri');
  return {
    MaBC: bc.MaBC, GiaTri: bc.GiaTri === null ? null : Number(bc.GiaTri), TrangThaiBC: bc.TrangThaiBC, NgayGui: bc.NgayGui ? new Date(bc.NgayGui) : null,
    MaHS: giao.MaHS, MaDV: giao.MaDV, TenDV: giao.TenDV, MaKy: ky.MaKy, TenKy: ky.TenKy, TrangThaiKy: ky.TrangThaiKy,
    ChiSo: { ...chiSo, BatBuocMinhChung: !!chiSo.BatBuocMinhChung, BacDiem: bacDiem },
    MinhChung: minhChung.map((m) => ({ ...m, NgayTai: new Date(m.NgayTai) })),
    ThamDinh: thamDinh.map((t) => ({ ...t, NgayThamDinh: new Date(t.NgayThamDinh) })),
  };
}

module.exports = { layGiao, layBaoCao, luuNhap, themMinhChung, thayTheMinhChung, guiBaoCao, danhSachCho, ketLuan, chiTietBaoCao, yeuCauKhacDonVi };
