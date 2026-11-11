// Quản trị hệ thống: tài khoản và phân quyền (UC 1.1), nhật ký (UC 1.3).
import { useState } from 'react';
import { api } from '../api.js';
import { BaoLoi, HopThoai, Nhan, TrangThaiTai, Truong, fmtGio, useTai, useThaoTac } from '../ui.jsx';

function FormTaiKhoan({ tk, vaiTro, donVi, onDong, onXong }) {
  const moi = !tk.MaND;
  const [f, setF] = useState({ HoTen: '', TenDangNhap: '', MatKhau: '', Email: '', SDT: '', MaVaiTro: 'DAU_MOI', TrangThaiTK: 'HOAT_DONG', ...tk, MaDV: tk.MaDV || '' });
  const t = useThaoTac();
  const dat = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const luu = (e) => {
    e.preventDefault();
    const body = { ...f, MaDV: f.MaDV ? Number(f.MaDV) : null, MatKhau: f.MatKhau || undefined };
    t.chay(() => api(moi ? '/nguoidung' : `/nguoidung/${tk.MaND}`, { method: moi ? 'POST' : 'PUT', body })).then((ok) => ok && onXong());
  };
  return (
    <HopThoai tieuDe={moi ? 'Tạo tài khoản' : `Sửa tài khoản ${tk.TenDangNhap}`} onDong={onDong}>
      <form onSubmit={luu} className="luoi-2">
        <BaoLoi loi={t.loi} />
        <Truong nhan="Họ tên"><input required value={f.HoTen} onChange={dat('HoTen')} /></Truong>
        <Truong nhan="Tên đăng nhập"><input required disabled={!moi} value={f.TenDangNhap} onChange={dat('TenDangNhap')} /></Truong>
        <Truong nhan={moi ? 'Mật khẩu' : 'Đặt lại mật khẩu'} goiY={moi ? 'Ít nhất 6 ký tự' : 'Bỏ trống nếu không đổi'}><input type="password" required={moi} value={f.MatKhau} onChange={dat('MatKhau')} autoComplete="new-password" /></Truong>
        <Truong nhan="Vai trò"><select value={f.MaVaiTro} onChange={dat('MaVaiTro')}>{vaiTro.map((v) => <option key={v.MaVaiTro} value={v.MaVaiTro}>{v.TenVaiTro}</option>)}</select></Truong>
        <Truong nhan="Đơn vị" goiY="Bắt buộc với đầu mối và chuyên viên thẩm định"><select value={f.MaDV} onChange={dat('MaDV')}><option value="">(không)</option>{donVi.map((d) => <option key={d.MaDV} value={d.MaDV}>{d.TenDV}</option>)}</select></Truong>
        <Truong nhan="Email"><input type="email" value={f.Email || ''} onChange={dat('Email')} /></Truong>
        <Truong nhan="Số điện thoại"><input value={f.SDT || ''} onChange={dat('SDT')} /></Truong>
        {!moi && <Truong nhan="Trạng thái" goiY="Tài khoản không xóa, chỉ khóa"><select value={f.TrangThaiTK} onChange={dat('TrangThaiTK')}><option value="HOAT_DONG">Hoạt động</option><option value="KHOA">Khóa</option></select></Truong>}
        <div className="hang-nut ca-hang"><button type="button" className="nut" onClick={onDong}>Hủy</button><button className="nut chinh" disabled={t.dangChay}>Lưu</button></div>
      </form>
    </HopThoai>
  );
}

export function TaiKhoan() {
  const t = useTai(async () => { const [nd, vaiTro, donVi] = await Promise.all([api('/nguoidung'), api('/vaitro'), api('/donvi')]); return { nd, vaiTro, donVi }; });
  const [sua, setSua] = useState(null);
  return (
    <>
      <div className="dau-trang"><h2>Tài khoản và phân quyền</h2><button className="nut chinh" onClick={() => setSua({})}>Tạo tài khoản</button></div>
      <TrangThaiTai t={t}>{(d) => (
        <>
          <table className="bang">
            <thead><tr><th>Tên đăng nhập</th><th>Họ tên</th><th>Vai trò</th><th>Đơn vị</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>{d.nd.map((x) => (
              <tr key={x.MaND}><td>{x.TenDangNhap}</td><td>{x.HoTen}</td><td>{x.TenVaiTro}</td><td>{x.TenDV || '—'}</td><td><Nhan ma={x.TrangThaiTK} /></td>
                <td className="phai"><button className="nut nho" onClick={() => setSua(x)}>Sửa</button></td></tr>
            ))}</tbody>
          </table>
          {sua && <FormTaiKhoan tk={sua} vaiTro={d.vaiTro} donVi={d.donVi} onDong={() => setSua(null)} onXong={() => { setSua(null); t.taiLai(); }} />}
        </>
      )}</TrangThaiTai>
    </>
  );
}

export function NhatKy() {
  const [tu, setTu] = useState('');
  const [loc, setLoc] = useState('');
  const t = useTai(() => api(`/nhatky${loc ? `?tu=${encodeURIComponent(loc)}` : ''}`), [loc]);
  return (
    <>
      <div className="dau-trang"><h2>Nhật ký hệ thống</h2>
        <form className="hang-nut" onSubmit={(e) => { e.preventDefault(); setLoc(tu); }}><input placeholder="Tìm theo đối tượng" value={tu} onChange={(e) => setTu(e.target.value)} /><button className="nut">Tìm</button></form>
      </div>
      <p className="mo">Nhật ký chỉ đọc, không sửa và không xóa. Hiển thị 300 dòng mới nhất.</p>
      <TrangThaiTai t={t}>{(ds) => (
        <table className="bang">
          <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Đối tượng</th></tr></thead>
          <tbody>{ds.map((x) => <tr key={x.MaNK}><td className="khong-xuong">{fmtGio(x.ThoiGian)}</td><td>{x.HoTen} ({x.TenDangNhap})</td><td><code>{x.HanhDong}</code></td><td>{x.DoiTuong}</td></tr>)}
            {ds.length === 0 && <tr><td colSpan="4" className="mo">Không có dòng nào.</td></tr>}</tbody>
        </table>
      )}</TrangThaiTai>
    </>
  );
}
