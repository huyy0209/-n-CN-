// Danh mục của cán bộ chủ trì: đơn vị (UC 1.4), loại minh chứng (UC 1.6).
import { useState } from 'react';
import { api } from '../api.js';
import { BaoLoi, HopThoai, TrangThaiTai, Truong, useTai, useThaoTac } from '../ui.jsx';

export function DonVi() {
  const t = useTai(async () => { const [donVi, loai] = await Promise.all([api('/donvi'), api('/loaidonvi')]); return { donVi, loai }; });
  const [sua, setSua] = useState(null);
  const tt = useThaoTac();
  const luu = (e) => {
    e.preventDefault();
    const body = { TenDV: sua.TenDV, Email: sua.Email, MaLoaiDV: Number(sua.MaLoaiDV) };
    tt.chay(() => api(sua.MaDV ? `/donvi/${sua.MaDV}` : '/donvi', { method: sua.MaDV ? 'PUT' : 'POST', body })).then((ok) => { if (ok) { setSua(null); t.taiLai(); } });
  };
  const xoa = (x) => window.confirm(`Xóa đơn vị "${x.TenDV}"?`) && tt.chay(() => api(`/donvi/${x.MaDV}`, { method: 'DELETE' })).then((ok) => ok && t.taiLai());
  return (
    <>
      <div className="dau-trang"><h2>Đơn vị được đánh giá</h2><button className="nut chinh" onClick={() => { tt.setLoi(null); setSua({ TenDV: '', Email: '', MaLoaiDV: t.duLieu?.loai[0]?.MaLoaiDV }); }}>Thêm đơn vị</button></div>
      {!sua && <BaoLoi loi={tt.loi} />}
      <TrangThaiTai t={t}>{(d) => (
        <>
          <table className="bang">
            <thead><tr><th>Tên đơn vị</th><th>Loại đơn vị</th><th>Email</th><th /></tr></thead>
            <tbody>{d.donVi.map((x) => (
              <tr key={x.MaDV}><td>{x.TenDV}</td><td>{x.TenLoaiDV}</td><td>{x.Email || '—'}</td>
                <td className="phai"><button className="nut nho" onClick={() => { tt.setLoi(null); setSua(x); }}>Sửa</button> <button className="nut nho nguy" onClick={() => xoa(x)}>Xóa</button></td></tr>
            ))}</tbody>
          </table>
          {sua && (
            <HopThoai tieuDe={sua.MaDV ? 'Sửa đơn vị' : 'Thêm đơn vị'} onDong={() => setSua(null)}>
              <form onSubmit={luu}>
                <BaoLoi loi={tt.loi} />
                <Truong nhan="Tên đơn vị"><input required value={sua.TenDV} onChange={(e) => setSua({ ...sua, TenDV: e.target.value })} /></Truong>
                <Truong nhan="Loại đơn vị"><select value={sua.MaLoaiDV} onChange={(e) => setSua({ ...sua, MaLoaiDV: e.target.value })}>{d.loai.map((l) => <option key={l.MaLoaiDV} value={l.MaLoaiDV}>{l.TenLoaiDV}</option>)}</select></Truong>
                <Truong nhan="Email"><input type="email" value={sua.Email || ''} onChange={(e) => setSua({ ...sua, Email: e.target.value })} /></Truong>
                <div className="hang-nut"><button type="button" className="nut" onClick={() => setSua(null)}>Hủy</button><button className="nut chinh" disabled={tt.dangChay}>Lưu</button></div>
              </form>
            </HopThoai>
          )}
        </>
      )}</TrangThaiTai>
    </>
  );
}

export function LoaiMinhChung() {
  const t = useTai(() => api('/loaiminhchung'));
  const [ten, setTen] = useState('');
  const tt = useThaoTac();
  const them = (e) => { e.preventDefault(); tt.chay(() => api('/loaiminhchung', { method: 'POST', body: { TenLoaiMC: ten } })).then((ok) => { if (ok) { setTen(''); t.taiLai(); } }); };
  const doiTen = (x) => { const moi = window.prompt('Tên loại minh chứng', x.TenLoaiMC); if (moi && moi.trim()) tt.chay(() => api(`/loaiminhchung/${x.MaLoaiMC}`, { method: 'PUT', body: { TenLoaiMC: moi } })).then((ok) => ok && t.taiLai()); };
  const xoa = (x) => window.confirm(`Xóa loại "${x.TenLoaiMC}"?`) && tt.chay(() => api(`/loaiminhchung/${x.MaLoaiMC}`, { method: 'DELETE' })).then((ok) => ok && t.taiLai());
  return (
    <>
      <div className="dau-trang"><h2>Loại minh chứng</h2>
        <form className="hang-nut" onSubmit={them}><input required placeholder="Tên loại mới" value={ten} onChange={(e) => setTen(e.target.value)} /><button className="nut chinh" disabled={tt.dangChay}>Thêm</button></form>
      </div>
      <BaoLoi loi={tt.loi} />
      <TrangThaiTai t={t}>{(ds) => (
        <table className="bang hep">
          <thead><tr><th>Tên loại minh chứng</th><th /></tr></thead>
          <tbody>{ds.map((x) => <tr key={x.MaLoaiMC}><td>{x.TenLoaiMC}</td><td className="phai"><button className="nut nho" onClick={() => doiTen(x)}>Đổi tên</button> <button className="nut nho nguy" onClick={() => xoa(x)}>Xóa</button></td></tr>)}</tbody>
        </table>
      )}</TrangThaiTai>
    </>
  );
}
