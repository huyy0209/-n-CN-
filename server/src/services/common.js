// Hàm dùng chung: lỗi nghiệp vụ, nhật ký (BR20), thông báo trong ứng dụng (BR15).

// Lỗi nghiệp vụ có mã HTTP; route trả thông báo này cho giao diện
class Loi extends Error {
  constructor(status, message, chiTiet) {
    super(message);
    this.status = status;
    this.chiTiet = chiTiet;
  }
}

// Ghi nhật ký. Bảng NHATKY chỉ có thêm, không có API sửa/xóa (BR20).
async function ghiNhatKy(trx, maND, hanhDong, doiTuong, now = new Date()) {
  await trx('NHATKY').insert({ HanhDong: hanhDong, DoiTuong: String(doiTuong).slice(0, 300), ThoiGian: now, MaND: maND });
}

// Gửi thông báo trong ứng dụng cho danh sách người dùng
async function guiThongBao(trx, dsMaND, loaiTB, noiDung, now = new Date()) {
  const ds = [...new Set(dsMaND)];
  for (const maND of ds) {
    await trx('THONGBAO').insert({ LoaiTB: loaiTB, NoiDung: noiDung.slice(0, 500), NgayGui: now, DaDoc: false, MaND: maND });
  }
}

// Các tài khoản đang hoạt động theo vai trò (và đơn vị nếu có)
async function nguoiTheoVaiTro(trx, maVaiTro, maDV) {
  const q = trx('NGUOIDUNG').where({ MaVaiTro: maVaiTro, TrangThaiTK: 'HOAT_DONG' });
  if (maDV !== undefined) q.where({ MaDV: maDV });
  return (await q.select('MaND')).map((x) => x.MaND);
}

module.exports = { Loi, ghiNhatKy, guiThongBao, nguoiTheoVaiTro };
