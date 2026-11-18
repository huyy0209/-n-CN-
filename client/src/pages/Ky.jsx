// Nhóm UC 2 - Kỳ đánh giá: tạo, giao đơn vị, mở, gia hạn, chốt; và theo dõi tiến độ (UC 5.1).
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useNguoi } from '../nguoi.js';
import { BaoLoi, HopThoai, NHAN, Nhan, TrangThaiTai, Truong, fmtNgay, useTai, useThaoTac } from '../ui.jsx';

function FormKy({ boBanHanh, onDong, onXong }) {
  const [f, setF] = useState({ TenKy: '', LoaiKy: 'NAM', MaBo: boBanHanh[0]?.MaBo || '', NgayBatDau: '', NgayKetThuc: '', HanNop: '', NgayChot: '' });
  const t = useThaoTac();
  const dat = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const luu = (e) => { e.preventDefault(); t.chay(async () => { const { MaKy } = await api('/ky', { method: 'POST', body: { ...f, MaBo: Number(f.MaBo) } }); onXong(MaKy); }); };
  return (
    <HopThoai tieuDe="Tạo kỳ đánh giá" onDong={onDong}>
      {boBanHanh.length === 0 ? <div className="bao loi">Chưa có bộ chỉ số nào ở trạng thái Ban hành. Hãy ban hành một bộ trước.</div> : (
        <form onSubmit={luu} className="luoi-2">
          <BaoLoi loi={t.loi} />
          <div className="ca-hang"><Truong nhan="Tên kỳ"><input required value={f.TenKy} onChange={dat('TenKy')} placeholder="Kỳ năm 2026" /></Truong></div>
          <Truong nhan="Loại kỳ" goiY="Kỳ chỉ gồm chỉ số có tần suất khớp loại kỳ"><select value={f.LoaiKy} onChange={dat('LoaiKy')}><option value="NAM">Năm</option><option value="QUY">Quý</option></select></Truong>
          <Truong nhan="Bộ chỉ số (đã ban hành)"><select value={f.MaBo} onChange={dat('MaBo')}>{boBanHanh.map((b) => <option key={b.MaBo} value={b.MaBo}>{b.TenBo}</option>)}</select></Truong>
          <Truong nhan="Ngày bắt đầu số liệu"><input type="date" required value={f.NgayBatDau} onChange={dat('NgayBatDau')} /></Truong>
          <Truong nhan="Ngày kết thúc số liệu"><input type="date" required value={f.NgayKetThuc} onChange={dat('NgayKetThuc')} /></Truong>
          <Truong nhan="Hạn nộp" goiY="Tính đến hết ngày"><input type="date" required value={f.HanNop} onChange={dat('HanNop')} /></Truong>
          <Truong nhan="Ngày chốt dự kiến"><input type="date" required value={f.NgayChot} onChange={dat('NgayChot')} /></Truong>
          <div className="hang-nut ca-hang"><button type="button" className="nut" onClick={onDong}>Hủy</button><button className="nut chinh" disabled={t.dangChay}>Tạo kỳ (Nháp)</button></div>
        </form>
      )}
    </HopThoai>
  );
}

export function Ky() {
  const nguoi = useNguoi();
  const chuTri = nguoi.MaVaiTro === 'CHU_TRI';
  const t = useTai(async () => { const [ky, bo] = await Promise.all([api('/ky'), chuTri ? api('/bochiso') : []]); return { ky, bo }; });
  const [tao, setTao] = useState(false);
  const dieuHuong = useNavigate();
  return (
    <>
      <div className="dau-trang"><h2>{chuTri ? 'Kỳ đánh giá' : 'Tiến độ các kỳ đánh giá'}</h2>{chuTri && <button className="nut chinh" onClick={() => setTao(true)}>Tạo kỳ</button>}</div>
      <TrangThaiTai t={t}>{(d) => (
        <>
          <table className="bang">
            <thead><tr><th>Kỳ</th><th>Loại</th><th>Khoảng số liệu</th><th>Hạn nộp</th><th>Ngày chốt</th><th>Bộ chỉ số</th><th>Trạng thái</th></tr></thead>
            <tbody>{d.ky.map((k) => (
              <tr key={k.MaKy}><td><Link to={`/ky/${k.MaKy}`}>{k.TenKy}</Link></td><td>{NHAN[k.LoaiKy]}</td><td>{fmtNgay(k.NgayBatDau)} – {fmtNgay(k.NgayKetThuc)}</td><td>{fmtNgay(k.HanNop)}</td><td>{fmtNgay(k.NgayChot)}</td><td>{k.TenBo}</td><td><Nhan ma={k.TrangThaiKy} /></td></tr>
            ))}{d.ky.length === 0 && <tr><td colSpan="7" className="mo">Chưa có kỳ nào.</td></tr>}</tbody>
          </table>
          {tao && <FormKy boBanHanh={d.bo.filter((b) => b.TrangThaiBo === 'BAN_HANH')} onDong={() => setTao(false)} onXong={(ma) => dieuHuong(`/ky/${ma}`)} />}
        </>
      )}</TrangThaiTai>
    </>
  );
}

export function KyChiTiet() {
  const { id } = useParams();
  const nguoi = useNguoi();
  const chuTri = nguoi.MaVaiTro === 'CHU_TRI';
  const dieuHuong = useNavigate();
  const t = useTai(async () => { const [ky, donVi] = await Promise.all([api(`/ky/${id}`), chuTri ? api('/donvi') : []]); return { ky, donVi }; }, [id]);
  const tt = useThaoTac();
  const [giao, setGiao] = useState(null); // danh sách MaDV đang chọn để giao
  const [giaHan, setGiaHan] = useState(null); // { lượt giao, HanMoi }
  const [chot, setChot] = useState(null); // thống kê trước khi chốt
  const lam = (ham) => tt.chay(ham).then((ok) => { if (ok) t.taiLai(); return ok; });

  return (
    <TrangThaiTai t={t}>{({ ky, donVi }) => {
      const nhap = ky.TrangThaiKy === 'NHAP';
      const dangMo = ky.TrangThaiKy === 'DANG_MO';
      const daGiao = ky.TienDo.map((g) => g.MaDV);
      const chuaGiao = donVi.filter((d) => !daGiao.includes(d.MaDV));
      const moChot = () => tt.chay(async () => setChot(await api(`/ky/${id}/thongke-chot`)));
      return (
        <>
          <p><Link to="/ky">← Danh sách kỳ</Link></p>
          <div className="dau-trang">
            <div><h2>{ky.TenKy} <Nhan ma={ky.TrangThaiKy} /></h2>
              <p className="mo">Kỳ {NHAN[ky.LoaiKy].toLowerCase()} · Số liệu {fmtNgay(ky.NgayBatDau)} – {fmtNgay(ky.NgayKetThuc)} · Hạn nộp {fmtNgay(ky.HanNop)} · {ky.TrangThaiKy === 'DA_CHOT' ? 'Đã chốt' : 'Chốt dự kiến'} {fmtNgay(ky.NgayChot)} · {ky.TenBo}</p></div>
            {chuTri && <div className="hang-nut">
              {!giao && ky.TrangThaiKy !== 'DA_CHOT' && chuaGiao.length > 0 && <button className="nut" onClick={() => setGiao(nhap ? chuaGiao.map((d) => d.MaDV) : [])}>Giao đơn vị</button>}
              {nhap && <button className="nut chinh" onClick={() => window.confirm('Mở kỳ? Các đơn vị được giao sẽ nhận thông báo và bắt đầu nhập số liệu.') && lam(() => api(`/ky/${id}/mo`, { method: 'POST' }))}>Mở kỳ</button>}
              {nhap && <button className="nut nguy" onClick={() => window.confirm('Xóa kỳ nháp này?') && tt.chay(async () => { await api(`/ky/${id}`, { method: 'DELETE' }); dieuHuong('/ky'); })}>Xóa kỳ</button>}
              {dangMo && <button className="nut chinh" onClick={moChot}>Chốt kỳ</button>}
            </div>}
            {ky.TrangThaiKy === 'DA_CHOT' && <Link className="nut chinh" to={`/ket-qua/${id}`}>Xem kết quả</Link>}
          </div>
          {!giaHan && !chot && !giao && <BaoLoi loi={tt.loi} />}

          <h3>Đơn vị được giao và tiến độ</h3>
          <table className="bang">
            <thead><tr><th>Đơn vị</th><th>Loại</th><th>Hạn hiện hành</th><th className="so">Chỉ số</th><th className="so">Đạt</th><th className="so">Chờ thẩm định</th><th className="so">Cần bổ sung</th><th className="so">Chưa gửi</th><th className="so">Gửi trễ</th>{chuTri && <th />}</tr></thead>
            <tbody>{ky.TienDo.map((g) => (
              <tr key={g.MaHS}>
                <td>{g.TenDV}</td><td>{g.TenLoaiDV}</td>
                <td>{fmtNgay(g.HanHienHanh)}{g.DaGiaHan && <small className="mo"> (đã gia hạn)</small>}{g.DaQuaHan && dangMo && <> <Nhan ma="KHOA" chu="Quá hạn" /></>}</td>
                <td className="so">{g.SoChiSo}</td><td className="so">{g.Dat}</td><td className="so">{g.ChoThamDinh}</td><td className="so">{g.CanBoSung}</td>
                <td className={`so ${g.ChuaGuiQuaHan ? 'chu-do' : ''}`}>{g.ChuaNop}</td><td className={`so ${g.GuiTre ? 'chu-do' : ''}`}>{g.GuiTre}</td>
                {chuTri && <td className="phai khong-xuong">
                  {nhap && <button className="nut nho nguy" onClick={() => lam(() => api(`/giao/${g.MaHS}`, { method: 'DELETE' }))}>Bỏ giao</button>}
                  {dangMo && !g.DaQuaHan && <button className="nut nho" onClick={() => { tt.setLoi(null); setGiaHan({ ...g, HanMoi: '' }); }}>Gia hạn</button>}
                </td>}
              </tr>
            ))}{ky.TienDo.length === 0 && <tr><td colSpan="10" className="mo">Chưa giao đơn vị nào. Kỳ cần ít nhất một lượt giao mới mở được.</td></tr>}</tbody>
          </table>
          <p className="mo">Trễ hạn tính theo lần gửi đầu so với hạn hiện hành của đơn vị; trễ hạn không trừ điểm.</p>

          {giao && (
            <HopThoai tieuDe="Giao đơn vị vào kỳ" onDong={() => setGiao(null)}>
              <BaoLoi loi={tt.loi} />
              <div className="cot-chon">{chuaGiao.map((d) => <label key={d.MaDV}><input type="checkbox" checked={giao.includes(d.MaDV)} onChange={() => setGiao(giao.includes(d.MaDV) ? giao.filter((x) => x !== d.MaDV) : [...giao, d.MaDV])} /> {d.TenDV} <small className="mo">({d.TenLoaiDV})</small></label>)}</div>
              <div className="hang-nut"><button className="nut" onClick={() => setGiao(null)}>Hủy</button><button className="nut chinh" disabled={!giao.length || tt.dangChay} onClick={() => lam(() => api(`/ky/${id}/giao`, { method: 'POST', body: { MaDV: giao } })).then((ok) => ok && setGiao(null))}>Giao {giao.length} đơn vị</button></div>
            </HopThoai>
          )}
          {giaHan && (
            <HopThoai tieuDe={`Gia hạn cho ${giaHan.TenDV}`} onDong={() => setGiaHan(null)}>
              <form onSubmit={(e) => { e.preventDefault(); lam(() => api(`/giao/${giaHan.MaHS}/giahan`, { method: 'POST', body: { HanMoi: giaHan.HanMoi } })).then((ok) => ok && setGiaHan(null)); }}>
                <BaoLoi loi={tt.loi} />
                <p>Hạn hiện hành: <strong>{fmtNgay(giaHan.HanHienHanh)}</strong>. Hạn mới phải sau hạn hiện hành và không vượt ngày chốt {fmtNgay(ky.NgayChot)}.</p>
                <Truong nhan="Hạn mới"><input type="date" required min={giaHan.HanHienHanh} max={ky.NgayChot} value={giaHan.HanMoi} onChange={(e) => setGiaHan({ ...giaHan, HanMoi: e.target.value })} /></Truong>
                <div className="hang-nut"><button type="button" className="nut" onClick={() => setGiaHan(null)}>Hủy</button><button className="nut chinh" disabled={tt.dangChay}>Gia hạn</button></div>
              </form>
            </HopThoai>
          )}
          {chot && (
            <HopThoai tieuDe={`Chốt ${ky.TenKy}`} onDong={() => setChot(null)}>
              <BaoLoi loi={tt.loi} />
              <table className="bang gon"><tbody>
                <tr><td>Số đơn vị</td><td className="so">{chot.SoDonVi}</td></tr>
                <tr><td>Báo cáo Đạt</td><td className="so">{chot.Dat}</td></tr>
                <tr><td>Chờ thẩm định</td><td className="so">{chot.ChoThamDinh}</td></tr>
                <tr><td>Cần bổ sung</td><td className="so">{chot.CanBoSung}</td></tr>
                <tr><td>Chưa gửi</td><td className="so">{chot.ChuaNop}</td></tr>
              </tbody></table>
              {!chot.DuDieuKien && <div className="bao loi">Chưa chốt được. {chot.LyDo}</div>}
              {chot.DuDieuKien && (chot.ChoThamDinh + chot.CanBoSung + chot.ChuaNop > 0) && <div className="bao canh">Các chỉ số chưa Đạt hoặc chưa gửi sẽ tính 0 điểm. Có thể hủy để chờ thẩm định xong.</div>}
              {chot.DuDieuKien && <p>Sau khi chốt, hệ thống tính điểm, xếp hạng, công bố kết quả và khóa dữ liệu của kỳ. Không mở lại được.</p>}
              <div className="hang-nut"><button className="nut" onClick={() => setChot(null)}>Hủy</button>
                {chot.DuDieuKien && <button className="nut chinh" disabled={tt.dangChay} onClick={() => tt.chay(async () => { await api(`/ky/${id}/chot`, { method: 'POST' }); dieuHuong(`/ket-qua/${id}`); })}>Xác nhận chốt kỳ</button>}</div>
            </HopThoai>
          )}
        </>
      );
    }}</TrangThaiTai>
  );
}
