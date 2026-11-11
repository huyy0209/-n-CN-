// Nhóm UC 4 - Chuyên viên thẩm định: danh sách chờ, kiểm tra số liệu và minh chứng, kết luận, lịch sử.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, taiTep } from '../api.js';
import { BaoLoi, NHAN, Nhan, TrangThaiTai, Truong, fmtGiaTri, fmtGio, fmtSo, useTai, useThaoTac } from '../ui.jsx';

export function ThamDinhCho() {
  const t = useTai(() => api('/thamdinh/cho'));
  return (
    <>
      <div className="dau-trang"><h2>Báo cáo chờ thẩm định</h2><button className="nut" onClick={t.taiLai}>Làm mới</button></div>
      <p className="mo">Danh sách đã loại báo cáo của đơn vị bạn. Chuyên viên tự chọn báo cáo để thẩm định.</p>
      <TrangThaiTai t={t}>{(ds) => (
        <table className="bang">
          <thead><tr><th>Kỳ</th><th>Đơn vị</th><th>Chỉ số</th><th>Giá trị</th><th>Gửi lần đầu</th><th>Lần</th><th /></tr></thead>
          <tbody>{ds.map((x) => (
            <tr key={x.MaBC}><td>{x.TenKy}</td><td>{x.TenDV}</td><td>{x.KyHieu} {x.TenChiSo}</td><td>{fmtGiaTri(x.GiaTri, x)}</td><td>{fmtGio(x.NgayGui)}</td>
              <td>{x.SoVongDaThamDinh ? `Gửi lại (vòng ${x.SoVongDaThamDinh + 1})` : 'Lần đầu'}</td><td className="phai"><Link className="nut nho" to={`/tham-dinh/${x.MaBC}`}>Thẩm định</Link></td></tr>
          ))}{ds.length === 0 && <tr><td colSpan="7" className="mo">Không có báo cáo nào đang chờ.</td></tr>}</tbody>
        </table>
      )}</TrangThaiTai>
    </>
  );
}

export function ThamDinhChiTiet() {
  const { maBC } = useParams();
  const dieuHuong = useNavigate();
  const t = useTai(() => api(`/baocao/${maBC}`), [maBC]);
  const tt = useThaoTac();
  const [nhanXet, setNhanXet] = useState('');
  const ketLuan = (kl) => {
    if (kl === 'CHUA_DAT' && !nhanXet.trim()) return tt.setLoi(new Error('Kết luận Chưa đạt bắt buộc có nhận xét.'));
    tt.chay(async () => { await api(`/thamdinh/${maBC}/ketluan`, { method: 'POST', body: { KetLuan: kl, NhanXet: nhanXet } }); dieuHuong('/tham-dinh'); });
  };
  return (
    <TrangThaiTai t={t}>{(bc) => {
      const c = bc.ChiSo;
      const cho = bc.TrangThaiBC === 'CHO_THAM_DINH' && bc.TrangThaiKy === 'DANG_MO';
      return (
        <>
          <p><Link to="/tham-dinh">← Danh sách chờ</Link></p>
          <div className="dau-trang"><div><h2>{c.KyHieu} {c.TenChiSo} <Nhan ma={bc.TrangThaiBC} /></h2><p className="mo">{bc.TenDV} · {bc.TenKy} · gửi lần đầu {fmtGio(bc.NgayGui)}</p></div></div>
          <div className="luoi-the">
            <section className="the">
              <h4>Số liệu</h4>
              <p className="so-lon">{fmtGiaTri(bc.GiaTri, c)}</p>
              <p className="mo">{NHAN[c.KieuCongThuc]}{c.KieuCongThuc === 'TY_LE' && ` · chỉ tiêu ${fmtSo(c.ChiTieu, 4)}`} · {NHAN[c.ChieuTot]} · tối đa {fmtSo(c.DiemToiDa)} điểm</p>
              {c.KieuCongThuc === 'BAC_THANG' && <p className="mo">Bậc điểm: {c.BacDiem.map((b) => `${fmtSo(b.TuGiaTri, 4)}${b.DenGiaTri === null ? '+' : `–${fmtSo(b.DenGiaTri, 4)}`}: ${fmtSo(b.Diem)}`).join('; ')}</p>}
            </section>
            <section className="the">
              <h4>Minh chứng {c.BatBuocMinhChung && <small className="mo">(bắt buộc)</small>}</h4>
              <ul className="ds-tep">{bc.MinhChung.map((m) => (
                <li key={m.MaMC} className={m.TrangThaiMC === 'DA_THAY_THE' ? 'nhat' : ''}><button className="lien-ket" onClick={() => tt.chay(() => taiTep(m.MaMC, m.TenTep))}>{m.TenTep}</button> <small className="mo">{m.TenLoaiMC} · {fmtGio(m.NgayTai)}</small> {m.TrangThaiMC === 'DA_THAY_THE' && <Nhan ma="DA_THAY_THE" />}</li>
              ))}{bc.MinhChung.length === 0 && <li className="mo">Không có tệp.</li>}</ul>
            </section>
          </div>
          {bc.ThamDinh.length > 0 && <>
            <h3>Các vòng thẩm định trước</h3>
            <table className="bang"><thead><tr><th>Vòng</th><th>Kết luận</th><th>Nhận xét</th><th>Chuyên viên</th><th>Thời gian</th></tr></thead>
              <tbody>{bc.ThamDinh.map((x) => <tr key={x.VongThamDinh}><td>{x.VongThamDinh}</td><td><Nhan ma={x.KetLuan} /></td><td>{x.NhanXet || '—'}</td><td>{x.HoTen}</td><td>{fmtGio(x.NgayThamDinh)}</td></tr>)}</tbody></table>
          </>}
          {cho ? (
            <section className="the">
              <h4>Kết luận vòng {bc.ThamDinh.length + 1}</h4>
              <BaoLoi loi={tt.loi} />
              <Truong nhan="Nhận xét" goiY="Bắt buộc khi kết luận Chưa đạt"><textarea rows="3" value={nhanXet} onChange={(e) => setNhanXet(e.target.value)} maxLength={1000} /></Truong>
              <div className="hang-nut"><button className="nut nguy" disabled={tt.dangChay} onClick={() => ketLuan('CHUA_DAT')}>Chưa đạt, yêu cầu bổ sung</button><button className="nut chinh" disabled={tt.dangChay} onClick={() => ketLuan('DAT')}>Đạt</button></div>
            </section>
          ) : <><BaoLoi loi={tt.loi} /><div className="bao tin">Báo cáo không ở trạng thái Chờ thẩm định nên không kết luận được.</div></>}
        </>
      );
    }}</TrangThaiTai>
  );
}

export function ThamDinhLichSu() {
  const t = useTai(() => api('/thamdinh/lichsu'));
  return (
    <>
      <div className="dau-trang"><h2>Lịch sử thẩm định của tôi</h2></div>
      <TrangThaiTai t={t}>{(ds) => (
        <table className="bang">
          <thead><tr><th>Thời gian</th><th>Kỳ</th><th>Đơn vị</th><th>Chỉ số</th><th>Vòng</th><th>Kết luận</th><th>Nhận xét</th><th /></tr></thead>
          <tbody>{ds.map((x) => (
            <tr key={x.MaTD}><td className="khong-xuong">{fmtGio(x.NgayThamDinh)}</td><td>{x.TenKy}</td><td>{x.TenDV}</td><td>{x.KyHieu} {x.TenChiSo}</td><td>{x.VongThamDinh}</td><td><Nhan ma={x.KetLuan} /></td><td>{x.NhanXet || '—'}</td>
              <td className="phai"><Link className="nut nho" to={`/tham-dinh/${x.MaBC}`}>Xem</Link></td></tr>
          ))}{ds.length === 0 && <tr><td colSpan="8" className="mo">Chưa thẩm định báo cáo nào.</td></tr>}</tbody>
        </table>
      )}</TrangThaiTai>
    </>
  );
}
