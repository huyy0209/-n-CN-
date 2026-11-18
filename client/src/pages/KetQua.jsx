// Kết quả và xếp hạng của kỳ đã chốt: xếp hạng theo loại đơn vị và bảng tổng hợp chung (BR12).
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, taiVe } from '../api.js';
import { useNguoi } from '../nguoi.js';
import { BaoLoi, HopThoai, Nhan, TrangThaiTai, fmtGiaTri, fmtNgay, fmtSo, useTai, useThaoTac } from '../ui.jsx';

function ChiTietDiem({ maHS, onDong }) {
  const t = useTai(() => api(`/ketqua/giao/${maHS}`), [maHS]);
  return (
    <HopThoai tieuDe="Điểm chi tiết" onDong={onDong} rong>
      <TrangThaiTai t={t}>{(d) => (
        <>
          <p><strong>{d.TenDV}</strong> · {d.TenKy} · Tổng điểm <strong>{fmtSo(d.TongDiem)}</strong> (trọng số áp dụng {fmtSo(d.TongTrongSo)}%)</p>
          <h4>Theo nhóm</h4>
          <table className="bang gon"><thead><tr><th>Nhóm</th><th className="so">Điểm đạt ÷ tối đa</th><th className="so">Tỷ lệ nhóm</th><th className="so">Trọng số</th><th className="so">Đóng góp</th></tr></thead>
            <tbody>{d.Nhom.map((n) => <tr key={n.MaNhom}><td>{n.TenNhom}</td><td className="so">{fmtSo(n.Dat)} ÷ {fmtSo(n.ToiDa)}</td><td className="so">{fmtSo(n.TyLe, 4)}</td><td className="so">{fmtSo(n.TrongSo)}</td><td className="so">{fmtSo(n.DongGop)}</td></tr>)}</tbody></table>
          <p className="mo">Tổng điểm = tổng đóng góp ÷ tổng trọng số áp dụng × 100. Nhóm không có chỉ số áp dụng cho loại đơn vị thì không tính.</p>
          <h4>Theo chỉ số</h4>
          <table className="bang gon"><thead><tr><th>Mã</th><th>Chỉ số</th><th>Giá trị</th><th>Trạng thái</th><th className="so">Điểm</th></tr></thead>
            <tbody>{d.ChiSo.map((c) => <tr key={c.MaChiSo}><td>{c.KyHieu}</td><td>{c.TenChiSo}</td><td>{fmtGiaTri(c.GiaTri, c)}</td><td>{c.TrangThaiBC ? <Nhan ma={c.TrangThaiBC} /> : <Nhan ma="x" chu="Không nộp" />}</td><td className="so">{fmtSo(c.Diem)}/{fmtSo(c.DiemToiDa)}</td></tr>)}</tbody></table>
          <p className="mo">Chỉ số chưa Đạt hoặc không nộp tính 0 điểm.</p>
        </>
      )}</TrangThaiTai>
    </HopThoai>
  );
}

export function KetQua() {
  const { maKy } = useParams();
  const nguoi = useNguoi();
  const dieuHuong = useNavigate();
  const dsKy = useTai(async () => (await api('/ky')).filter((k) => k.TrangThaiKy === 'DA_CHOT'));
  const chon = maKy || dsKy.duLieu?.[0]?.MaKy;
  const t = useTai(() => (chon ? api(`/ketqua/ky/${chon}`) : Promise.resolve(null)), [chon]);
  const [xem, setXem] = useState(null);
  const xuat = useThaoTac();
  const duocXuat = ['CHU_TRI', 'LANH_DAO'].includes(nguoi.MaVaiTro);
  const [che, setChe] = useState('LOAI'); // LOAI = xếp hạng theo loại đơn vị, CHUNG = bảng tổng hợp chung
  // Đầu mối chỉ xem điểm chi tiết của đơn vị mình (BR19)
  const xemDuoc = (k) => nguoi.MaVaiTro !== 'DAU_MOI' || nguoi.MaDV === k.MaDV;

  const bang = (ds, cotHang) => (
    <table className="bang">
      <thead><tr><th className="so">Hạng</th><th>Đơn vị</th>{cotHang === 'HangChung' && <th>Loại</th>}<th className="so">Tổng điểm</th><th>Mức độ</th><th /></tr></thead>
      <tbody>{[...ds].sort((a, b) => a[cotHang] - b[cotHang] || a.TenDV.localeCompare(b.TenDV, 'vi')).map((k) => (
        <tr key={k.MaKQ} className={nguoi.MaDV === k.MaDV && nguoi.MaVaiTro === 'DAU_MOI' ? 'cua-toi' : ''}>
          <td className="so"><strong>{k[cotHang]}</strong></td><td>{k.TenDV}</td>{cotHang === 'HangChung' && <td>{k.TenLoaiDV}</td>}
          <td className="so">{fmtSo(k.TongDiem)}</td><td>{k.TenMucDo || '—'}</td>
          <td className="phai">{xemDuoc(k) && <button className="nut nho" onClick={() => setXem(k.MaHS)}>Điểm chi tiết</button>}</td></tr>
      ))}</tbody>
    </table>
  );

  return (
    <>
      <div className="dau-trang"><h2>Kết quả và xếp hạng</h2>
        <div className="hang-nut">{dsKy.duLieu && dsKy.duLieu.length > 0 && <select value={chon || ''} onChange={(e) => dieuHuong(`/ket-qua/${e.target.value}`)} aria-label="Chọn kỳ">{dsKy.duLieu.map((k) => <option key={k.MaKy} value={k.MaKy}>{k.TenKy}</option>)}</select>}
        {duocXuat && chon && <button className="nut" disabled={xuat.dangChay} onClick={() => xuat.chay(() => taiVe(`/ketqua/ky/${chon}/xuat`, `ket-qua-ky-${chon}.xlsx`))}>Xuất Excel</button>}</div>
      </div>
      <BaoLoi loi={dsKy.loi || xuat.loi} />
      {dsKy.duLieu && dsKy.duLieu.length === 0 && <p className="mo">Chưa có kỳ nào được chốt. Điểm và thứ hạng được công bố sau khi chốt kỳ.</p>}
      {chon && <TrangThaiTai t={t}>{(d) => d && (
        <>
          <p className="mo">{d.Ky.TenKy} · chốt ngày {fmtNgay(d.Ky.NgayChot)} · {d.KetQua.length} đơn vị{d.Ky.LoaiKy === 'QUY' && ' · Kỳ quý dùng theo dõi tiến độ; kết quả công bố chính thức là kỳ năm'}</p>
          <div className="tab"><button className={che === 'LOAI' ? 'chon' : ''} onClick={() => setChe('LOAI')}>Xếp hạng theo loại đơn vị</button><button className={che === 'CHUNG' ? 'chon' : ''} onClick={() => setChe('CHUNG')}>Bảng tổng hợp chung</button></div>
          {che === 'CHUNG' ? bang(d.KetQua, 'HangChung') : [...new Set(d.KetQua.map((k) => k.TenLoaiDV))].sort().map((loai) => (
            <section key={loai}><h3>{loai}</h3>{bang(d.KetQua.filter((k) => k.TenLoaiDV === loai), 'HangTheoLoai')}</section>
          ))}
          <p className="mo">Đồng điểm thì đồng hạng.</p>
        </>
      )}</TrangThaiTai>}
      {xem && <ChiTietDiem maHS={xem} onDong={() => setXem(null)} />}
    </>
  );
}
