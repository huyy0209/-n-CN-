// Khung ứng dụng: đăng nhập, menu theo vai trò, thông báo, định tuyến.
import { useEffect, useState } from 'react';
import { NguCanh } from './nguoi.js';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, datToken, layToken } from './api.js';
import { BaoLoi, HopThoai, fmtGio, useThaoTac } from './ui.jsx';
import { TaiKhoan, NhatKy } from './pages/QuanTri.jsx';
import { DonVi, LoaiMinhChung } from './pages/DanhMuc.jsx';
import { BoChiSo, BoChiSoChiTiet } from './pages/BoChiSo.jsx';
import { Ky, KyChiTiet } from './pages/Ky.jsx';
import { BaoCao, BaoCaoGiao } from './pages/BaoCao.jsx';
import { ThamDinhCho, ThamDinhChiTiet, ThamDinhLichSu } from './pages/ThamDinh.jsx';
import { KetQua } from './pages/KetQua.jsx';
import { Dashboard, SoSanh } from './pages/TongHop.jsx';


// Menu của từng vai trò: [đường dẫn, nhãn]
const MENU = {
  QUAN_TRI: [['/tai-khoan', 'Tài khoản'], ['/nhat-ky', 'Nhật ký']],
  CHU_TRI: [['/ky', 'Kỳ đánh giá'], ['/bo-chi-so', 'Bộ chỉ số'], ['/don-vi', 'Đơn vị'], ['/loai-minh-chung', 'Loại minh chứng'], ['/ket-qua', 'Kết quả, xếp hạng'], ['/dashboard', 'Dashboard'], ['/so-sanh', 'So sánh các kỳ']],
  DAU_MOI: [['/bao-cao', 'Báo cáo của đơn vị'], ['/ket-qua', 'Kết quả, xếp hạng']],
  THAM_DINH: [['/tham-dinh', 'Chờ thẩm định'], ['/tham-dinh-lich-su', 'Lịch sử thẩm định'], ['/ket-qua', 'Kết quả, xếp hạng']],
  LANH_DAO: [['/dashboard', 'Dashboard'], ['/ky', 'Tiến độ các kỳ'], ['/ket-qua', 'Kết quả, xếp hạng'], ['/so-sanh', 'So sánh các kỳ']],
};

function DangNhap({ onXong }) {
  const [f, setF] = useState({ TenDangNhap: '', MatKhau: '' });
  const t = useThaoTac();
  const gui = (e) => {
    e.preventDefault();
    t.chay(async () => { const { token } = await api('/auth/login', { method: 'POST', body: f }); datToken(token); await onXong(); });
  };
  return (
    <div className="trang-dn">
      <form className="the dn" onSubmit={gui}>
        <p className="nhan-nho">Đề tài IS028</p>
        <h1>Theo dõi chỉ số chuyển đổi số</h1>
        <p className="mo">Cấp sở, ban, ngành và UBND xã, phường, đặc khu</p>
        <BaoLoi loi={t.loi} />
        <label className="truong"><span>Tên đăng nhập</span><input autoFocus value={f.TenDangNhap} onChange={(e) => setF({ ...f, TenDangNhap: e.target.value })} autoComplete="username" /></label>
        <label className="truong"><span>Mật khẩu</span><input type="password" value={f.MatKhau} onChange={(e) => setF({ ...f, MatKhau: e.target.value })} autoComplete="current-password" /></label>
        <button className="nut chinh" disabled={t.dangChay}>{t.dangChay ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      </form>
    </div>
  );
}

function ThongBao() {
  const [mo, setMo] = useState(false);
  const [tb, setTB] = useState({ ChuaDoc: 0, DanhSach: [] });
  const tai = () => api('/thongbao').then(setTB).catch(() => {});
  useEffect(() => { tai(); const h = setInterval(tai, 60000); return () => clearInterval(h); }, []);
  const moHop = async () => { setMo(true); if (tb.ChuaDoc) { await api('/thongbao/doc-tat-ca', { method: 'POST' }).catch(() => {}); } };
  return (
    <>
      <button className="nut nhe" onClick={moHop}>Thông báo{tb.ChuaDoc > 0 && <span className="dem">{tb.ChuaDoc}</span>}</button>
      {mo && (
        <HopThoai tieuDe="Thông báo" onDong={() => { setMo(false); tai(); }}>
          {tb.DanhSach.length === 0 && <p className="mo">Chưa có thông báo.</p>}
          <ul className="ds-tb">
            {tb.DanhSach.map((x) => <li key={x.MaTB} className={x.DaDoc ? '' : 'moi'}><div>{x.NoiDung}</div><small>{fmtGio(x.NgayGui)}</small></li>)}
          </ul>
        </HopThoai>
      )}
    </>
  );
}

export default function App() {
  const [nguoi, setNguoi] = useState(undefined); // undefined = đang kiểm tra, null = chưa đăng nhập
  const dieuHuong = useNavigate();
  const napNguoi = async () => {
    if (!layToken()) return setNguoi(null);
    try { setNguoi(await api('/auth/me')); } catch { datToken(null); setNguoi(null); }
  };
  useEffect(() => { napNguoi(); }, []);

  if (nguoi === undefined) return <p className="mo giua">Đang tải…</p>;
  if (!nguoi) return <DangNhap onXong={async () => { await napNguoi(); dieuHuong('/'); }} />;

  const menu = MENU[nguoi.MaVaiTro] || [];
  const dangXuat = () => { datToken(null); setNguoi(null); dieuHuong('/'); };
  const co = (...vt) => vt.includes(nguoi.MaVaiTro);
  return (
    <NguCanh.Provider value={nguoi}>
      <div className="khung">
        <aside className="ben">
          <div className="thuong-hieu"><strong>Chỉ số chuyển đổi số</strong><small>IS028</small></div>
          <nav>{menu.map(([d, n]) => <NavLink key={d} to={d}>{n}</NavLink>)}</nav>
          <div className="nguoi">
            <strong>{nguoi.HoTen}</strong>
            <small>{nguoi.TenVaiTro}</small>
            {nguoi.TenDV && <small>{nguoi.TenDV}</small>}
          </div>
        </aside>
        <div className="chinh-vung">
          <header className="tren"><ThongBao /><button className="nut nhe" onClick={dangXuat}>Đăng xuất</button></header>
          <main>
            <Routes>
              <Route path="/" element={<Navigate to={menu[0]?.[0] || '/ket-qua'} replace />} />
              {co('QUAN_TRI') && <><Route path="/tai-khoan" element={<TaiKhoan />} /><Route path="/nhat-ky" element={<NhatKy />} /></>}
              {co('CHU_TRI') && <>
                <Route path="/bo-chi-so" element={<BoChiSo />} /><Route path="/bo-chi-so/:id" element={<BoChiSoChiTiet />} />
                <Route path="/don-vi" element={<DonVi />} /><Route path="/loai-minh-chung" element={<LoaiMinhChung />} />
              </>}
              {co('CHU_TRI', 'LANH_DAO') && <><Route path="/ky" element={<Ky />} /><Route path="/ky/:id" element={<KyChiTiet />} /></>}
              {co('CHU_TRI', 'LANH_DAO') && <>
                <Route path="/dashboard" element={<Dashboard />} /><Route path="/dashboard/:maKy" element={<Dashboard />} />
                <Route path="/so-sanh" element={<SoSanh />} /><Route path="/so-sanh/:maKy" element={<SoSanh />} />
              </>}
              {co('DAU_MOI') && <><Route path="/bao-cao" element={<BaoCao />} /><Route path="/bao-cao/:maHS" element={<BaoCaoGiao />} /></>}
              {co('THAM_DINH') && <>
                <Route path="/tham-dinh" element={<ThamDinhCho />} /><Route path="/tham-dinh/:maBC" element={<ThamDinhChiTiet />} />
                <Route path="/tham-dinh-lich-su" element={<ThamDinhLichSu />} />
              </>}
              {!co('QUAN_TRI') && <><Route path="/ket-qua" element={<KetQua />} /><Route path="/ket-qua/:maKy" element={<KetQua />} /></>}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </NguCanh.Provider>
  );
}
