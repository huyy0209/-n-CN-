// Nhóm UC 5 cho Lãnh đạo và Cán bộ chủ trì: Dashboard (5.3) và So sánh các kỳ (5.2). Chỉ dùng số liệu của kỳ Đã chốt.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, taiVe } from '../api.js';
import { BaoLoi, TrangThaiTai, fmtNgay, fmtSo, useTai, useThaoTac } from '../ui.jsx';

// Danh sách kỳ đã chốt + kỳ đang chọn (theo URL, mặc định kỳ mới nhất)
function useKyDaChot(maKy) {
  const dsKy = useTai(async () => (await api('/ky')).filter((k) => k.TrangThaiKy === 'DA_CHOT'));
  return { dsKy, chon: maKy || dsKy.duLieu?.[0]?.MaKy };
}

function ChonKy({ dsKy, chon, duong }) {
  const dieuHuong = useNavigate();
  if (!dsKy.duLieu || dsKy.duLieu.length === 0) return null;
  return <select value={chon || ''} onChange={(e) => dieuHuong(`${duong}/${e.target.value}`)} aria-label="Chọn kỳ đã chốt">{dsKy.duLieu.map((k) => <option key={k.MaKy} value={k.MaKy}>{k.TenKy}</option>)}</select>;
}

// Biểu đồ cột ngang. Mỗi dòng: { nhan, phu?, cot: [{ giaTri, loai, ten }] }; loai: 'nay' | 'truoc'
function CotNgang({ dong, toiDa = 100, donVi = '', chuGiai }) {
  return (
    <div className="bieu-do" role="img" aria-label="Biểu đồ cột ngang, số liệu có trong bảng bên dưới hoặc nhãn từng cột">
      {chuGiai && <div className="chu-giai">{chuGiai.map(([loai, ten]) => <span key={loai}><i className={`o-mau ${loai}`} />{ten}</span>)}</div>}
      {dong.map((d, i) => (
        <div className="bd-dong" key={i}>
          <div className="bd-nhan" title={d.nhan}>{d.nhan}{d.phu && <small>{d.phu}</small>}</div>
          <div className="bd-cot">
            {d.cot.map((c, j) => (
              <div className="bd-ray" key={j} title={`${d.nhan}${c.ten ? ` – ${c.ten}` : ''}: ${c.giaTri === null ? 'không có' : fmtSo(c.giaTri) + donVi}`}>
                {c.giaTri !== null && <div className={`bd-thanh ${c.loai || 'nay'}`} style={{ width: `${Math.max((c.giaTri / toiDa) * 100, 0.5)}%` }} />}
                <span className="bd-so">{c.giaTri === null ? '—' : fmtSo(c.giaTri)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const O = ({ nhan, so, phu }) => <div className="the o-so"><small>{nhan}</small><strong>{so}</strong>{phu && <span>{phu}</span>}</div>;

export function Dashboard() {
  const { maKy } = useParams();
  const { dsKy, chon } = useKyDaChot(maKy);
  const t = useTai(() => (chon ? api(`/dashboard/ky/${chon}`) : Promise.resolve(null)), [chon]);
  const [loai, setLoai] = useState('');
  const xuat = useThaoTac();
  return (
    <>
      <div className="dau-trang"><h2>Dashboard</h2>
        <div className="hang-nut">
          <ChonKy dsKy={dsKy} chon={chon} duong="/dashboard" />
          {chon && <button className="nut" disabled={xuat.dangChay} onClick={() => xuat.chay(() => taiVe(`/ketqua/ky/${chon}/xuat`, `ket-qua-ky-${chon}.xlsx`))}>Xuất báo cáo Excel</button>}
        </div>
      </div>
      <BaoLoi loi={dsKy.loi || xuat.loi} />
      {dsKy.duLieu && dsKy.duLieu.length === 0 && <p className="mo">Chưa có kỳ nào được chốt. Điểm và hạng chỉ lấy từ kỳ Đã chốt.</p>}
      {chon && <TrangThaiTai t={t}>{(d) => d && (() => {
        const dv = d.DonVi.filter((x) => !loai || x.TenLoaiDV === loai);
        return (
          <>
            <p className="mo">{d.Ky.TenKy} · chốt ngày {fmtNgay(d.Ky.NgayChot)} · <Link to={`/ket-qua/${d.Ky.MaKy}`}>bảng xếp hạng</Link> · <Link to={`/so-sanh/${d.Ky.MaKy}`}>so với kỳ trước</Link></p>
            <div className="luoi-o">
              <O nhan="Số đơn vị" so={d.SoDonVi} />
              <O nhan="Điểm trung bình" so={fmtSo(d.DiemTrungBinh)} phu="thang 100" />
              <O nhan="Cao nhất" so={fmtSo(d.CaoNhat?.TongDiem)} phu={d.CaoNhat?.TenDV} />
              <O nhan="Thấp nhất" so={fmtSo(d.ThapNhat?.TongDiem)} phu={d.ThapNhat?.TenDV} />
              {d.TheoLoai.map((l) => <O key={l.TenLoaiDV} nhan={`Trung bình: ${l.TenLoaiDV}`} so={fmtSo(l.DiemTrungBinh)} phu={`${l.SoDonVi} đơn vị`} />)}
            </div>

            <section className="the">
              <div className="dau-muc"><h4>Tổng điểm theo đơn vị</h4>
                <select value={loai} onChange={(e) => setLoai(e.target.value)} aria-label="Lọc loại đơn vị"><option value="">Tất cả loại đơn vị</option>{d.TheoLoai.map((l) => <option key={l.TenLoaiDV}>{l.TenLoaiDV}</option>)}</select></div>
              <CotNgang dong={dv.map((x) => ({ nhan: x.TenDV, phu: `Hạng ${loai ? x.HangTheoLoai : x.HangChung} · ${x.TenMucDo || '—'}`, cot: [{ giaTri: x.TongDiem }] }))} donVi=" điểm" />
            </section>

            <div className="luoi-the">
              <section className="the">
                <h4>Số đơn vị theo mức độ</h4>
                <CotNgang toiDa={Math.max(d.SoDonVi, 1)} donVi=" đơn vị" dong={d.TheoMucDo.map((m) => ({ nhan: m.TenMucDo, phu: `${fmtSo(m.DiemTu)}–${fmtSo(m.DiemDen)} điểm`, cot: [{ giaTri: m.SoDonVi }] }))} />
              </section>
              <section className="the">
                <h4>Điểm nhóm trung bình <small className="mo">(quy về thang 100)</small></h4>
                <CotNgang donVi=" điểm" dong={d.TheoNhom.map((n) => ({ nhan: n.TenNhom, phu: `${n.SoDonVi} đơn vị có áp dụng`, cot: [{ giaTri: n.DiemTrungBinh }] }))} />
              </section>
            </div>
            <p className="mo">Điểm nhóm = điểm đạt ÷ điểm tối đa của các chỉ số áp dụng trong nhóm × 100, tính lại từ báo cáo Đạt.</p>
          </>
        );
      })()}</TrangThaiTai>}
    </>
  );
}

// Chênh lệch: luôn có dấu và mũi tên, không chỉ dựa vào màu
function Chenh({ x, le = 2 }) {
  if (x === null || x === undefined) return <span className="mo">—</span>;
  if (x === 0) return <span className="mo">0</span>;
  return <span className={x > 0 ? 'tang' : 'giam'}>{x > 0 ? '▲ +' : '▼ −'}{fmtSo(Math.abs(x), le)}</span>;
}

export function SoSanh() {
  const { maKy } = useParams();
  const { dsKy, chon } = useKyDaChot(maKy);
  const t = useTai(() => (chon ? api(`/sosanh/ky/${chon}`) : Promise.resolve(null)), [chon]);
  const [loai, setLoai] = useState('');
  const [mo, setMo] = useState(null); // MaDV đang xem chi tiết
  return (
    <>
      <div className="dau-trang"><h2>So sánh các kỳ</h2><ChonKy dsKy={dsKy} chon={chon} duong="/so-sanh" /></div>
      <BaoLoi loi={dsKy.loi} />
      {dsKy.duLieu && dsKy.duLieu.length === 0 && <p className="mo">Chưa có dữ liệu: chưa có kỳ nào được chốt.</p>}
      {chon && <TrangThaiTai t={t}>{(d) => d && (() => {
        const dsLoai = [...new Set(d.DonVi.map((x) => x.TenLoaiDV))].sort();
        const dv = d.DonVi.filter((x) => !loai || x.TenLoaiDV === loai);
        const coTruoc = !!d.KyTruoc;
        return (
          <>
            {coTruoc
              ? <p className="mo">{d.Ky.TenKy} so với <strong>{d.KyTruoc.TenKy}</strong> (kỳ đã chốt liền trước cùng loại). {d.CungBo ? 'Hai kỳ dùng cùng bộ chỉ số nên so được đến từng chỉ số.' : 'Hai kỳ khác bộ chỉ số: chỉ so tổng điểm, điểm nhóm và mức độ.'}</p>
              : <div className="bao tin">Không có kỳ đã chốt liền trước cùng loại với {d.Ky.TenKy}. Chỉ hiển thị kết quả của kỳ này, không có cột chênh lệch.</div>}
            <div className="hang-nut trai"><select value={loai} onChange={(e) => setLoai(e.target.value)} aria-label="Lọc loại đơn vị"><option value="">Tất cả loại đơn vị</option>{dsLoai.map((l) => <option key={l}>{l}</option>)}</select></div>

            <section className="the">
              <h4>Tổng điểm {coTruoc ? 'hai kỳ' : d.Ky.TenKy}</h4>
              <CotNgang donVi=" điểm" chuGiai={coTruoc ? [['nay', d.Ky.TenKy], ['truoc', d.KyTruoc.TenKy]] : null}
                dong={dv.map((x) => ({ nhan: x.TenDV, cot: coTruoc ? [{ giaTri: x.Diem, loai: 'nay', ten: d.Ky.TenKy }, { giaTri: x.DiemTruoc, loai: 'truoc', ten: d.KyTruoc.TenKy }] : [{ giaTri: x.Diem }] }))} />
            </section>

            <table className="bang">
              <thead><tr><th>Đơn vị</th>{coTruoc && <th className="so">Điểm kỳ trước</th>}<th className="so">Điểm kỳ này</th>{coTruoc && <th className="so">Chênh điểm</th>}
                <th className="so">Hạng theo loại</th>{coTruoc && <th className="so">Thay đổi hạng</th>}<th>Mức độ</th><th /></tr></thead>
              <tbody>{dv.map((x) => {
                const dangMo = mo === x.MaDV;
                return [
                  <tr key={x.MaDV}>
                    <td>{x.TenDV}<small className="mo"> · {x.TenLoaiDV}</small>{coTruoc && !(x.CoKyNay && x.CoKyTruoc) && <div><small className="mo">Chỉ có mặt ở {x.CoKyNay ? 'kỳ này' : 'kỳ trước'}, không so sánh được</small></div>}</td>
                    {coTruoc && <td className="so">{x.DiemTruoc === null ? '—' : fmtSo(x.DiemTruoc)}</td>}
                    <td className="so"><strong>{x.Diem === null ? '—' : fmtSo(x.Diem)}</strong></td>
                    {coTruoc && <td className="so"><Chenh x={x.ChenhDiem} /></td>}
                    <td className="so">{coTruoc && x.HangTruoc !== null && x.Hang !== null ? `${x.HangTruoc} → ${x.Hang}` : (x.Hang ?? x.HangTruoc)}</td>
                    {coTruoc && <td className="so"><Chenh x={x.ChenhHang} le={0} /></td>}
                    <td>{coTruoc && x.MucDoTruoc && x.MucDo && x.MucDoTruoc !== x.MucDo ? `${x.MucDoTruoc} → ${x.MucDo}` : (x.MucDo || x.MucDoTruoc || '—')}</td>
                    <td className="phai"><button className="nut nho" aria-expanded={dangMo} onClick={() => setMo(dangMo ? null : x.MaDV)}>{dangMo ? 'Ẩn' : 'Theo nhóm'}</button></td>
                  </tr>,
                  dangMo && (
                    <tr key={`${x.MaDV}-ct`} className="dong-chi-tiet"><td colSpan={coTruoc ? 8 : 5}>
                      <div className="luoi-the">
                        <div>
                          <h4>Điểm nhóm <small className="mo">(thang 100)</small></h4>
                          <table className="bang gon"><thead><tr><th>Nhóm</th>{coTruoc && <th className="so">Kỳ trước</th>}<th className="so">Kỳ này</th>{coTruoc && <th className="so">Chênh</th>}</tr></thead>
                            <tbody>{x.Nhom.map((n) => <tr key={n.TenNhom}><td>{n.TenNhom}</td>{coTruoc && <td className="so">{n.DiemTruoc === null ? 'Không áp dụng' : fmtSo(n.DiemTruoc)}</td>}<td className="so">{n.Diem === null ? 'Không áp dụng' : fmtSo(n.Diem)}</td>{coTruoc && <td className="so"><Chenh x={n.Chenh} /></td>}</tr>)}</tbody></table>
                        </div>
                        {x.ChiSo && (
                          <div>
                            <h4>Điểm từng chỉ số</h4>
                            <table className="bang gon"><thead><tr><th>Mã</th><th>Chỉ số</th><th className="so">Kỳ trước</th><th className="so">Kỳ này</th><th className="so">Chênh</th></tr></thead>
                              <tbody>{x.ChiSo.map((c) => <tr key={c.KyHieu + c.TenChiSo}><td>{c.KyHieu}</td><td>{c.TenChiSo}</td><td className="so">{c.DiemTruoc === null ? '—' : fmtSo(c.DiemTruoc)}</td><td className="so">{fmtSo(c.Diem)}/{fmtSo(c.DiemToiDa)}</td><td className="so"><Chenh x={c.Chenh} /></td></tr>)}</tbody></table>
                          </div>
                        )}
                      </div>
                    </td></tr>
                  ),
                ];
              })}</tbody>
            </table>
            {coTruoc && <p className="mo">Thay đổi hạng: ▲ là lên hạng so với kỳ trước, tính theo hạng trong cùng loại đơn vị.</p>}
          </>
        );
      })()}</TrangThaiTai>}
    </>
  );
}
