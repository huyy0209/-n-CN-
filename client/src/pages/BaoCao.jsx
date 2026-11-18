// Nhóm UC 3 - Cán bộ đầu mối: nhập số liệu, đính kèm minh chứng, gửi và bổ sung báo cáo.
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, taiTep } from '../api.js';
import { BaoLoi, HopThoai, NHAN, Nhan, TrangThaiTai, Truong, fmtGiaTri, fmtGio, fmtNgay, fmtSo, useTai, useThaoTac } from '../ui.jsx';

export function BaoCao() {
  const t = useTai(() => api('/baocao/luot-giao'));
  return (
    <>
      <div className="dau-trang"><h2>Báo cáo của đơn vị</h2></div>
      <TrangThaiTai t={t}>{(ds) => (
        <table className="bang">
          <thead><tr><th>Kỳ</th><th>Hạn nộp của đơn vị</th><th>Trạng thái kỳ</th><th className="so">Chỉ số</th><th className="so">Đạt</th><th className="so">Chờ thẩm định</th><th className="so">Cần bổ sung</th><th className="so">Chưa gửi</th></tr></thead>
          <tbody>{ds.map((x) => (
            <tr key={x.MaHS}><td><Link to={`/bao-cao/${x.MaHS}`}>{x.TenKy}</Link></td>
              <td>{fmtNgay(x.TienDo.HanHienHanh)}{x.TienDo.DaQuaHan && x.TrangThaiKy === 'DANG_MO' && <> <Nhan ma="KHOA" chu="Quá hạn" /></>}</td><td><Nhan ma={x.TrangThaiKy} /></td>
              <td className="so">{x.TienDo.SoChiSo}</td><td className="so">{x.TienDo.Dat}</td><td className="so">{x.TienDo.ChoThamDinh}</td><td className={`so ${x.TienDo.CanBoSung ? 'chu-do' : ''}`}>{x.TienDo.CanBoSung}</td><td className="so">{x.TienDo.ChuaNop}</td></tr>
          ))}{ds.length === 0 && <tr><td colSpan="8" className="mo">Đơn vị chưa được giao vào kỳ nào.</td></tr>}</tbody>
        </table>
      )}</TrangThaiTai>
    </>
  );
}

// Ô nhập giá trị theo kiểu chỉ số
function NhapGiaTri({ chiSo, giaTri, onDoi, khoa }) {
  if (chiSo.KieuCongThuc === 'CO_KHONG') {
    return <select disabled={khoa} value={giaTri ?? ''} onChange={(e) => onDoi(e.target.value)}><option value="">(chưa chọn)</option><option value="1">Có</option><option value="0">Không</option></select>;
  }
  return <input type="number" step="any" disabled={khoa} value={giaTri ?? ''} onChange={(e) => onDoi(e.target.value)} />;
}

// Hộp thoại một chỉ số: nhập, minh chứng, gửi, xem nhận xét thẩm định
function HopChiSo({ maHS, chiSo, kyMo, loaiMC, onDong, onDoi }) {
  const [maBC, setMaBC] = useState(chiSo.MaBC);
  const t = useTai(() => (maBC ? api(`/baocao/${maBC}`) : Promise.resolve(null)), [maBC]);
  const [giaTri, setGiaTri] = useState(chiSo.GiaTri ?? '');
  const [canhBao, setCanhBao] = useState(null);
  const [maLoaiMC, setMaLoaiMC] = useState(loaiMC[0]?.MaLoaiMC || '');
  const tt = useThaoTac();
  const bc = t.duLieu;
  const trangThai = bc ? bc.TrangThaiBC : null;
  const suaDuoc = kyMo && (!trangThai || trangThai === 'NHAP' || trangThai === 'CAN_BO_SUNG');

  // Lưu nháp, trả về mã báo cáo (tạo mới nếu chưa có)
  const luu = async () => {
    const kq = await api(`/baocao/giao/${maHS}/chiso/${chiSo.MaChiSo}`, { method: 'PUT', body: { GiaTri: giaTri } });
    setCanhBao(kq.CanhBao);
    setMaBC(kq.MaBC);
    onDoi();
    return kq.MaBC;
  };
  const taiLen = (e) => {
    const tep = e.target.files[0];
    e.target.value = '';
    if (!tep) return;
    tt.chay(async () => {
      const ma = maBC || (await luu()); // cần có báo cáo nháp trước khi đính kèm
      const form = new FormData();
      form.append('MaLoaiMC', maLoaiMC);
      form.append('tep', tep);
      await api(`/baocao/${ma}/minhchung`, { method: 'POST', form });
      await t.taiLai();
      onDoi();
    });
  };
  const gui = () => tt.chay(async () => { const ma = await luu(); await api(`/baocao/${ma}/gui`, { method: 'POST' }); onDoi(); onDong(); });
  const nhanXetCuoi = bc && bc.ThamDinh.length ? bc.ThamDinh[bc.ThamDinh.length - 1] : null;

  return (
    <HopThoai tieuDe={`${chiSo.KyHieu || ''} ${chiSo.TenChiSo}`} onDong={onDong} rong>
      <p className="mo">{chiSo.TenNhom} · {NHAN[chiSo.KieuCongThuc]} · tối đa {fmtSo(chiSo.DiemToiDa)} điểm · minh chứng {chiSo.BatBuocMinhChung ? 'bắt buộc' : 'tùy chọn'} {trangThai && <Nhan ma={trangThai} />}</p>
      {trangThai === 'CAN_BO_SUNG' && nhanXetCuoi && <div className="bao canh"><strong>Yêu cầu bổ sung (vòng {nhanXetCuoi.VongThamDinh}, {nhanXetCuoi.HoTen}):</strong> {nhanXetCuoi.NhanXet}</div>}
      <BaoLoi loi={tt.loi || t.loi} />
      {canhBao && <div className="bao canh">{canhBao}</div>}

      <Truong nhan={`Giá trị báo cáo${chiSo.DonViTinh ? ` (${chiSo.DonViTinh})` : ''}`}><NhapGiaTri chiSo={chiSo} giaTri={giaTri} onDoi={(v) => { setGiaTri(v); setCanhBao(null); }} khoa={!suaDuoc} /></Truong>

      <h4>Minh chứng</h4>
      <table className="bang gon">
        <thead><tr><th>Tệp</th><th>Loại</th><th>Ngày tải</th><th>Trạng thái</th><th /></tr></thead>
        <tbody>{(bc?.MinhChung || []).map((m) => (
          <tr key={m.MaMC} className={m.TrangThaiMC === 'DA_THAY_THE' ? 'nhat' : ''}>
            <td><button className="lien-ket" onClick={() => tt.chay(() => taiTep(m.MaMC, m.TenTep))}>{m.TenTep}</button></td><td>{m.TenLoaiMC}</td><td>{fmtGio(m.NgayTai)}</td><td><Nhan ma={m.TrangThaiMC} /></td>
            <td className="phai">{suaDuoc && m.TrangThaiMC === 'HIEU_LUC' && <button className="nut nho" title="Tệp được giữ lại và đánh dấu Đã thay thế" onClick={() => tt.chay(async () => { await api(`/minhchung/${m.MaMC}/thaythe`, { method: 'POST' }); await t.taiLai(); onDoi(); })}>Đánh dấu thay thế</button>}</td>
          </tr>
        ))}{!(bc?.MinhChung || []).length && <tr><td colSpan="5" className="mo">Chưa có tệp nào.</td></tr>}</tbody>
      </table>
      {suaDuoc && (
        <div className="hang-nut trai">
          <select value={maLoaiMC} onChange={(e) => setMaLoaiMC(e.target.value)} aria-label="Loại minh chứng">{loaiMC.map((l) => <option key={l.MaLoaiMC} value={l.MaLoaiMC}>{l.TenLoaiMC}</option>)}</select>
          <label className="nut nho">Tải tệp lên<input type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={taiLen} /></label>
          <small className="mo">PDF, Word, Excel, JPG, PNG</small>
        </div>
      )}

      {bc && bc.ThamDinh.length > 0 && <>
        <h4>Lịch sử thẩm định</h4>
        <table className="bang gon"><thead><tr><th>Vòng</th><th>Kết luận</th><th>Nhận xét</th><th>Chuyên viên</th><th>Thời gian</th></tr></thead>
          <tbody>{bc.ThamDinh.map((x) => <tr key={x.VongThamDinh}><td>{x.VongThamDinh}</td><td><Nhan ma={x.KetLuan} /></td><td>{x.NhanXet || '—'}</td><td>{x.HoTen}</td><td>{fmtGio(x.NgayThamDinh)}</td></tr>)}</tbody></table>
      </>}

      <div className="hang-nut">
        <button className="nut" onClick={onDong}>Đóng</button>
        {suaDuoc && <button className="nut" disabled={tt.dangChay} onClick={() => tt.chay(luu)}>Lưu nháp</button>}
        {suaDuoc && <button className="nut chinh" disabled={tt.dangChay} onClick={gui}>{trangThai === 'CAN_BO_SUNG' ? 'Gửi lại' : 'Gửi thẩm định'}</button>}
      </div>
    </HopThoai>
  );
}

export function BaoCaoGiao() {
  const { maHS } = useParams();
  const t = useTai(async () => { const [d, loaiMC] = await Promise.all([api(`/baocao/giao/${maHS}`), api('/loaiminhchung')]); return { ...d, loaiMC }; }, [maHS]);
  const [mo, setMo] = useState(null);
  return (
    <TrangThaiTai t={t}>{(d) => {
      const kyMo = d.Ky.TrangThaiKy === 'DANG_MO';
      return (
        <>
          <p><Link to="/bao-cao">← Các kỳ của đơn vị</Link></p>
          <div className="dau-trang"><div><h2>{d.Ky.TenKy} <Nhan ma={d.Ky.TrangThaiKy} /></h2>
            <p className="mo">{d.Giao.TenDV} · Hạn nộp {fmtNgay(d.Giao.HanHienHanh)} (đến hết ngày){d.Giao.DaQuaHan && kyMo && ' · Đã quá hạn, báo cáo gửi lúc này được ghi nhận là trễ hạn'}</p></div>
            {d.Ky.TrangThaiKy === 'DA_CHOT' && <Link className="nut chinh" to={`/ket-qua/${d.Ky.MaKy}`}>Xem kết quả</Link>}</div>
          {!kyMo && <div className="bao tin">Kỳ đã chốt, dữ liệu của kỳ đã khóa.</div>}
          <table className="bang">
            <thead><tr><th>Mã</th><th>Chỉ số</th><th>Nhóm</th><th>Giá trị</th><th className="so">Minh chứng</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>{d.ChiSo.map((c) => (
              <tr key={c.MaChiSo}><td>{c.KyHieu}</td><td>{c.TenChiSo}</td><td>{c.TenNhom}</td><td>{fmtGiaTri(c.GiaTri, c)}</td>
                <td className="so">{c.SoMinhChung}{c.BatBuocMinhChung && c.SoMinhChung === 0 && <small className="chu-do"> thiếu</small>}</td>
                <td>{c.TrangThaiBC ? <Nhan ma={c.TrangThaiBC} /> : <Nhan ma="x" chu="Chưa nhập" />}</td>
                <td className="phai"><button className="nut nho" onClick={() => setMo(c)}>{kyMo && (!c.TrangThaiBC || ['NHAP', 'CAN_BO_SUNG'].includes(c.TrangThaiBC)) ? 'Nhập' : 'Xem'}</button></td></tr>
            ))}{d.ChiSo.length === 0 && <tr><td colSpan="7" className="mo">Không có chỉ số nào áp dụng cho đơn vị trong kỳ này.</td></tr>}</tbody>
          </table>
          {mo && <HopChiSo maHS={maHS} chiSo={mo} kyMo={kyMo} loaiMC={d.loaiMC} onDong={() => setMo(null)} onDoi={t.taiLai} />}
        </>
      );
    }}</TrangThaiTai>
  );
}
