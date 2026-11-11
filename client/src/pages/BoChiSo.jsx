// UC 1.5 - Quản lý bộ chỉ số theo phiên bản: tạo, sao chép, khai báo nhóm/chỉ số/bậc điểm/mức độ, ban hành.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { BaoLoi, HopThoai, NHAN, Nhan, TrangThaiTai, Truong, fmtNgay, fmtSo, useTai, useThaoTac } from '../ui.jsx';

export function BoChiSo() {
  const t = useTai(() => api('/bochiso'));
  const tt = useThaoTac();
  const dieuHuong = useNavigate();
  const tao = () => { const ten = window.prompt('Tên bộ chỉ số mới'); if (ten && ten.trim()) tt.chay(async () => { const { MaBo } = await api('/bochiso', { method: 'POST', body: { TenBo: ten } }); dieuHuong(`/bo-chi-so/${MaBo}`); }); };
  return (
    <>
      <div className="dau-trang"><h2>Bộ chỉ số</h2><button className="nut chinh" onClick={tao}>Tạo bộ mới</button></div>
      <p className="mo">Bộ đã ban hành bị khóa. Muốn thay đổi, hãy sao chép thành bộ mới; các kỳ cũ vẫn giữ căn cứ chấm của bộ cũ.</p>
      <BaoLoi loi={tt.loi} />
      <TrangThaiTai t={t}>{(ds) => (
        <table className="bang">
          <thead><tr><th>Tên bộ</th><th>Căn cứ</th><th>Ngày ban hành</th><th>Trạng thái</th></tr></thead>
          <tbody>{ds.map((b) => <tr key={b.MaBo}><td><Link to={`/bo-chi-so/${b.MaBo}`}>{b.TenBo}</Link></td><td>{b.CanCuPhapLy || '—'}</td><td>{fmtNgay(b.NgayBanHanh) || '—'}</td><td><Nhan ma={b.TrangThaiBo} /></td></tr>)}</tbody>
        </table>
      )}</TrangThaiTai>
    </>
  );
}

const CHI_SO_MOI = { KyHieu: '', TenChiSo: '', DiemToiDa: 10, KieuCongThuc: 'TY_LE', ChieuTot: 'CAO_TOT', ChiTieu: 100, GiaTriMin: 0, GiaTriMax: 100, DonViTinh: '%', TanSuat: 'NAM', BatBuocMinhChung: true, BacDiem: [], LoaiDonVi: [] };

function FormChiSo({ chiSo, maNhom, loaiDV, onDong, onXong }) {
  const [f, setF] = useState({ ...CHI_SO_MOI, ...chiSo, ChiTieu: chiSo.ChiTieu ?? '', DonViTinh: chiSo.DonViTinh ?? (chiSo.MaChiSo ? '' : '%'), BacDiem: (chiSo.BacDiem || []).map((b) => ({ ...b, DenGiaTri: b.DenGiaTri ?? '' })) });
  const t = useThaoTac();
  const dat = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const datBac = (i, k, v) => setF({ ...f, BacDiem: f.BacDiem.map((b, j) => (j === i ? { ...b, [k]: v } : b)) });
  const doiLoai = (ma) => setF({ ...f, LoaiDonVi: f.LoaiDonVi.includes(ma) ? f.LoaiDonVi.filter((x) => x !== ma) : [...f.LoaiDonVi, ma] });
  const luu = (e) => {
    e.preventDefault();
    t.chay(() => api(chiSo.MaChiSo ? `/chiso/${chiSo.MaChiSo}` : `/nhom/${maNhom}/chiso`, { method: chiSo.MaChiSo ? 'PUT' : 'POST', body: f })).then((ok) => ok && onXong());
  };
  const k = f.KieuCongThuc;
  return (
    <HopThoai tieuDe={chiSo.MaChiSo ? 'Sửa chỉ số' : 'Thêm chỉ số'} onDong={onDong} rong>
      <form onSubmit={luu} className="luoi-2">
        <BaoLoi loi={t.loi} />
        <Truong nhan="Ký hiệu"><input value={f.KyHieu || ''} onChange={dat('KyHieu')} placeholder="CS01" /></Truong>
        <Truong nhan="Điểm tối đa"><input type="number" step="any" min="0" required value={f.DiemToiDa} onChange={dat('DiemToiDa')} /></Truong>
        <div className="ca-hang"><Truong nhan="Tên chỉ số"><input required value={f.TenChiSo} onChange={dat('TenChiSo')} /></Truong></div>
        <Truong nhan="Kiểu công thức"><select value={k} onChange={dat('KieuCongThuc')}>{['CO_KHONG', 'TY_LE', 'BAC_THANG'].map((x) => <option key={x} value={x}>{NHAN[x]}</option>)}</select></Truong>
        <Truong nhan="Tần suất"><select value={f.TanSuat} onChange={dat('TanSuat')}><option value="NAM">Năm</option><option value="QUY">Quý</option></select></Truong>
        {k !== 'CO_KHONG' && <>
          <Truong nhan="Chiều tốt"><select value={f.ChieuTot} onChange={dat('ChieuTot')}><option value="CAO_TOT">Cao tốt</option><option value="THAP_TOT">Thấp tốt</option></select></Truong>
          <Truong nhan="Đơn vị tính"><input value={f.DonViTinh || ''} onChange={dat('DonViTinh')} placeholder="%, hộ, hoạt động…" /></Truong>
          <Truong nhan="Giá trị nhỏ nhất"><input type="number" step="any" required value={f.GiaTriMin} onChange={dat('GiaTriMin')} /></Truong>
          <Truong nhan="Giá trị lớn nhất"><input type="number" step="any" required value={f.GiaTriMax} onChange={dat('GiaTriMax')} /></Truong>
        </>}
        {k === 'TY_LE' && <Truong nhan="Chỉ tiêu" goiY="Cao tốt: điểm = min(giá trị ÷ chỉ tiêu; 1) × điểm tối đa"><input type="number" step="any" required value={f.ChiTieu} onChange={dat('ChiTieu')} /></Truong>}
        {k === 'BAC_THANG' && (
          <div className="ca-hang">
            <span className="nhan-truong">Bậc điểm (đến giá trị bỏ trống = không giới hạn trên)</span>
            <table className="bang gon">
              <thead><tr><th>Từ giá trị</th><th>Đến giá trị</th><th>Điểm</th><th /></tr></thead>
              <tbody>{f.BacDiem.map((b, i) => (
                <tr key={i}>
                  <td><input type="number" step="any" required value={b.TuGiaTri} onChange={(e) => datBac(i, 'TuGiaTri', e.target.value)} /></td>
                  <td><input type="number" step="any" value={b.DenGiaTri} onChange={(e) => datBac(i, 'DenGiaTri', e.target.value)} /></td>
                  <td><input type="number" step="any" required value={b.Diem} onChange={(e) => datBac(i, 'Diem', e.target.value)} /></td>
                  <td><button type="button" className="nut nho nguy" onClick={() => setF({ ...f, BacDiem: f.BacDiem.filter((_, j) => j !== i) })}>Bỏ</button></td>
                </tr>
              ))}</tbody>
            </table>
            <button type="button" className="nut nho" onClick={() => setF({ ...f, BacDiem: [...f.BacDiem, { TuGiaTri: '', DenGiaTri: '', Diem: '' }] })}>Thêm bậc</button>
          </div>
        )}
        <div className="ca-hang">
          <span className="nhan-truong">Áp dụng cho loại đơn vị</span>
          <div className="hang-chon">{loaiDV.map((l) => <label key={l.MaLoaiDV}><input type="checkbox" checked={f.LoaiDonVi.includes(l.MaLoaiDV)} onChange={() => doiLoai(l.MaLoaiDV)} /> {l.TenLoaiDV}</label>)}</div>
          <div className="hang-chon"><label><input type="checkbox" checked={!!f.BatBuocMinhChung} onChange={dat('BatBuocMinhChung')} /> Bắt buộc minh chứng</label></div>
        </div>
        <div className="hang-nut ca-hang"><button type="button" className="nut" onClick={onDong}>Hủy</button><button className="nut chinh" disabled={t.dangChay}>Lưu</button></div>
      </form>
    </HopThoai>
  );
}

// Mô tả cách chấm của một chỉ số bằng một dòng chữ
function cachCham(c) {
  if (c.KieuCongThuc === 'CO_KHONG') return 'Có: đủ điểm';
  if (c.KieuCongThuc === 'TY_LE') return `Chỉ tiêu ${fmtSo(c.ChiTieu, 4)}${c.DonViTinh === '%' ? '%' : ''}`;
  return c.BacDiem.map((b) => `${fmtSo(b.TuGiaTri, 4)}${b.DenGiaTri === null ? '+' : Number(b.DenGiaTri) !== Number(b.TuGiaTri) ? `–${fmtSo(b.DenGiaTri, 4)}` : ''}: ${fmtSo(b.Diem)}`).join('; ');
}

export function BoChiSoChiTiet() {
  const { id } = useParams();
  const dieuHuong = useNavigate();
  const t = useTai(async () => { const [bo, loaiDV] = await Promise.all([api(`/bochiso/${id}`), api('/loaidonvi')]); return { bo, loaiDV }; }, [id]);
  const tt = useThaoTac();
  const [suaCS, setSuaCS] = useState(null); // { chiSo, maNhom }
  const [suaMD, setSuaMD] = useState(null);
  const lam = (ham) => tt.chay(ham).then((ok) => ok && t.taiLai());

  return (
    <TrangThaiTai t={t}>{({ bo, loaiDV }) => {
      const nhap = bo.TrangThaiBo === 'NHAP';
      const tongTS = bo.Nhom.reduce((s, n) => s + Number(n.TrongSo), 0);
      const tenLoai = (ds) => (ds.length === loaiDV.length ? 'Tất cả' : ds.map((m) => loaiDV.find((l) => l.MaLoaiDV === m)?.TenLoaiDV).join(', ') || '—');
      const themNhom = () => { const ten = window.prompt('Tên nhóm chỉ số'); if (!ten) return; const ts = window.prompt('Trọng số (%)', '10'); if (ts) lam(() => api(`/bochiso/${id}/nhom`, { method: 'POST', body: { TenNhom: ten, TrongSo: ts } })); };
      const suaNhom = (n) => { const ten = window.prompt('Tên nhóm chỉ số', n.TenNhom); if (!ten) return; const ts = window.prompt('Trọng số (%)', Number(n.TrongSo)); if (ts) lam(() => api(`/nhom/${n.MaNhom}`, { method: 'PUT', body: { TenNhom: ten, TrongSo: ts } })); };
      const doiTen = () => { const ten = window.prompt('Tên bộ chỉ số', bo.TenBo); if (!ten) return; const cc = window.prompt('Căn cứ pháp lý', bo.CanCuPhapLy || ''); lam(() => api(`/bochiso/${id}`, { method: 'PUT', body: { TenBo: ten, CanCuPhapLy: cc } })); };
      const saoChep = () => { const ten = window.prompt('Tên bộ mới', `${bo.TenBo} (bản sao)`); if (ten) tt.chay(async () => { const { MaBo } = await api(`/bochiso/${id}/saochep`, { method: 'POST', body: { TenBo: ten } }); dieuHuong(`/bo-chi-so/${MaBo}`); }); };
      return (
        <>
          <p><Link to="/bo-chi-so">← Danh sách bộ chỉ số</Link></p>
          <div className="dau-trang">
            <div><h2>{bo.TenBo} <Nhan ma={bo.TrangThaiBo} /></h2><p className="mo">{bo.CanCuPhapLy}{bo.NgayBanHanh && ` · Ban hành ${fmtNgay(bo.NgayBanHanh)}`}</p></div>
            <div className="hang-nut">
              {nhap && <button className="nut" onClick={doiTen}>Sửa tên, căn cứ</button>}
              <button className="nut" onClick={saoChep}>Sao chép thành bộ mới</button>
              {nhap && <button className="nut chinh" onClick={() => window.confirm('Ban hành bộ chỉ số? Sau khi ban hành, nội dung bộ bị khóa.') && lam(() => api(`/bochiso/${id}/banhanh`, { method: 'POST' }))}>Ban hành</button>}
              {bo.TrangThaiBo === 'BAN_HANH' && <button className="nut nguy" onClick={() => window.confirm('Ngừng hiệu lực bộ này? Bộ sẽ không dùng được để mở kỳ mới.') && lam(() => api(`/bochiso/${id}/ngunghieuluc`, { method: 'POST' }))}>Ngừng hiệu lực</button>}
              {nhap && <button className="nut nguy" onClick={() => window.confirm('Xóa bộ nháp này?') && tt.chay(async () => { await api(`/bochiso/${id}`, { method: 'DELETE' }); dieuHuong('/bo-chi-so'); })}>Xóa bộ</button>}
            </div>
          </div>
          {!nhap && <div className="bao tin">Bộ đã khóa, không sửa được nhóm, chỉ số, bậc điểm, mức độ. Dùng "Sao chép thành bộ mới" để tạo phiên bản khác.</div>}
          <BaoLoi loi={tt.loi} />

          <div className="dau-muc"><h3>Nhóm và chỉ số <small className={Math.abs(tongTS - 100) < 0.001 ? 'mo' : 'chu-do'}>Tổng trọng số: {fmtSo(tongTS)}%</small></h3>{nhap && <button className="nut nho" onClick={themNhom}>Thêm nhóm</button>}</div>
          {bo.Nhom.length === 0 && <p className="mo">Chưa có nhóm nào.</p>}
          {bo.Nhom.map((n) => (
            <section className="the" key={n.MaNhom}>
              <div className="dau-muc"><h4>{n.TenNhom} <small className="mo">trọng số {fmtSo(n.TrongSo)}%</small></h4>
                {nhap && <div className="hang-nut"><button className="nut nho" onClick={() => suaNhom(n)}>Sửa nhóm</button><button className="nut nho nguy" onClick={() => window.confirm(`Xóa nhóm "${n.TenNhom}"?`) && lam(() => api(`/nhom/${n.MaNhom}`, { method: 'DELETE' }))}>Xóa nhóm</button><button className="nut nho" onClick={() => setSuaCS({ chiSo: {}, maNhom: n.MaNhom })}>Thêm chỉ số</button></div>}
              </div>
              <table className="bang gon">
                <thead><tr><th>Mã</th><th>Chỉ số</th><th>Kiểu</th><th>Cách chấm</th><th className="so">Tối đa</th><th>Tần suất</th><th>Áp dụng</th><th>Minh chứng</th>{nhap && <th />}</tr></thead>
                <tbody>{n.ChiSo.map((c) => (
                  <tr key={c.MaChiSo}><td>{c.KyHieu}</td><td>{c.TenChiSo}{c.ChieuTot === 'THAP_TOT' && <small className="mo"> (thấp tốt)</small>}</td><td>{NHAN[c.KieuCongThuc]}</td><td>{cachCham(c)}</td><td className="so">{fmtSo(c.DiemToiDa)}</td><td>{NHAN[c.TanSuat]}</td><td>{tenLoai(c.LoaiDonVi)}</td><td>{c.BatBuocMinhChung ? 'Bắt buộc' : 'Tùy chọn'}</td>
                    {nhap && <td className="phai khong-xuong"><button className="nut nho" onClick={() => setSuaCS({ chiSo: c, maNhom: n.MaNhom })}>Sửa</button> <button className="nut nho nguy" onClick={() => window.confirm(`Xóa chỉ số ${c.KyHieu || c.TenChiSo}?`) && lam(() => api(`/chiso/${c.MaChiSo}`, { method: 'DELETE' }))}>Xóa</button></td>}</tr>
                ))}{n.ChiSo.length === 0 && <tr><td colSpan="9" className="mo">Nhóm chưa có chỉ số.</td></tr>}</tbody>
              </table>
            </section>
          ))}

          <div className="dau-muc"><h3>Ngưỡng mức độ chuyển đổi số</h3>{nhap && <button className="nut nho" onClick={() => setSuaMD(bo.MucDo.map((m) => ({ ...m })))}>Sửa ngưỡng</button>}</div>
          <table className="bang hep">
            <thead><tr><th>Mức độ</th><th className="so">Từ điểm</th><th className="so">Đến điểm</th></tr></thead>
            <tbody>{bo.MucDo.map((m) => <tr key={m.MaMucDo}><td>{m.TenMucDo}</td><td className="so">{fmtSo(m.DiemTu)}</td><td className="so">{fmtSo(m.DiemDen)}</td></tr>)}{bo.MucDo.length === 0 && <tr><td colSpan="3" className="mo">Chưa khai báo.</td></tr>}</tbody>
          </table>
          <p className="mo">Điểm bằng biên dưới thuộc mức trên; các mức phải nối liền và phủ từ 0 đến 100.</p>

          {suaCS && <FormChiSo chiSo={suaCS.chiSo} maNhom={suaCS.maNhom} loaiDV={loaiDV} onDong={() => setSuaCS(null)} onXong={() => { setSuaCS(null); t.taiLai(); }} />}
          {suaMD && (
            <HopThoai tieuDe="Ngưỡng mức độ" onDong={() => setSuaMD(null)}>
              <form onSubmit={(e) => { e.preventDefault(); tt.chay(() => api(`/bochiso/${id}/mucdo`, { method: 'PUT', body: { MucDo: suaMD } })).then((ok) => { if (ok) { setSuaMD(null); t.taiLai(); } }); }}>
                <BaoLoi loi={tt.loi} />
                <table className="bang gon"><thead><tr><th>Tên mức</th><th>Từ điểm</th><th>Đến điểm</th><th /></tr></thead>
                  <tbody>{suaMD.map((m, i) => { const dat = (k) => (e) => setSuaMD(suaMD.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x))); return (
                    <tr key={i}><td><input required value={m.TenMucDo} onChange={dat('TenMucDo')} /></td><td><input type="number" step="any" required value={m.DiemTu} onChange={dat('DiemTu')} /></td><td><input type="number" step="any" required value={m.DiemDen} onChange={dat('DiemDen')} /></td><td><button type="button" className="nut nho nguy" onClick={() => setSuaMD(suaMD.filter((_, j) => j !== i))}>Bỏ</button></td></tr>
                  ); })}</tbody></table>
                <button type="button" className="nut nho" onClick={() => setSuaMD([...suaMD, { TenMucDo: '', DiemTu: '', DiemDen: '' }])}>Thêm mức</button>
                <div className="hang-nut"><button type="button" className="nut" onClick={() => setSuaMD(null)}>Hủy</button><button className="nut chinh" disabled={tt.dangChay}>Lưu</button></div>
              </form>
            </HopThoai>
          )}
        </>
      );
    }}</TrangThaiTai>
  );
}
