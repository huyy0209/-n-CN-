// Thành phần và hàm dùng chung cho giao diện.
import { useCallback, useEffect, useState } from 'react';

// Nhãn tiếng Việt cho các mã lưu trong CSDL
export const NHAN = {
  NHAP: 'Nháp', CHO_THAM_DINH: 'Chờ thẩm định', CAN_BO_SUNG: 'Cần bổ sung', DAT: 'Đạt', CHUA_DAT: 'Chưa đạt',
  BAN_HANH: 'Ban hành', HET_HIEU_LUC: 'Hết hiệu lực', DANG_MO: 'Đang mở', DA_CHOT: 'Đã chốt',
  HIEU_LUC: 'Còn hiệu lực', DA_THAY_THE: 'Đã thay thế', HOAT_DONG: 'Hoạt động', KHOA: 'Đã khóa',
  CO_KHONG: 'Có/không', TY_LE: 'Tỷ lệ', BAC_THANG: 'Bậc thang', CAO_TOT: 'Cao tốt', THAP_TOT: 'Thấp tốt', QUY: 'Quý', NAM: 'Năm',
};
const MAU = { DAT: 'xanh', BAN_HANH: 'xanh', DANG_MO: 'xanh', HOAT_DONG: 'xanh', HIEU_LUC: 'xanh', CHO_THAM_DINH: 'vang', CAN_BO_SUNG: 'do', CHUA_DAT: 'do', KHOA: 'do', DA_CHOT: 'tim' };

export const Nhan = ({ ma, chu }) => <span className={`nhan ${MAU[ma] || 'xam'}`}>{chu || NHAN[ma] || ma}</span>;

// 2026-01-15 -> 15/01/2026
export const fmtNgay = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '');
export const fmtGio = (s) => (s ? new Date(s).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '');
export const fmtSo = (x, le = 2) => (x === null || x === undefined ? '' : Number(x).toLocaleString('vi-VN', { maximumFractionDigits: le }));

// Hiển thị giá trị báo cáo theo kiểu chỉ số
export function fmtGiaTri(giaTri, chiSo) {
  if (giaTri === null || giaTri === undefined) return '—';
  if (chiSo.KieuCongThuc === 'CO_KHONG') return Number(giaTri) === 1 ? 'Có' : 'Không';
  return `${fmtSo(giaTri, 4)}${chiSo.DonViTinh ? (chiSo.DonViTinh === '%' ? '%' : ` ${chiSo.DonViTinh}`) : ''}`;
}

// Khung báo lỗi, kèm danh sách lỗi chi tiết nếu máy chủ trả về
export function BaoLoi({ loi }) {
  if (!loi) return null;
  return (
    <div className="bao loi" role="alert">
      {loi.message || String(loi)}
      {Array.isArray(loi.chiTiet) && <ul>{loi.chiTiet.map((x, i) => <li key={i}>{x}</li>)}</ul>}
    </div>
  );
}

// Tải dữ liệu khi vào trang; trả về { duLieu, dangTai, loi, taiLai }
export function useTai(ham, phuThuoc = []) {
  const [tt, setTT] = useState({ duLieu: null, dangTai: true, loi: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const taiLai = useCallback(() => ham().then((duLieu) => setTT({ duLieu, dangTai: false, loi: null })).catch((loi) => setTT({ duLieu: null, dangTai: false, loi })), phuThuoc);
  useEffect(() => { taiLai(); }, [taiLai]);
  return { ...tt, taiLai };
}

// Chạy một thao tác ghi: quản lý trạng thái đang chạy và lỗi
export function useThaoTac() {
  const [dangChay, setDangChay] = useState(false);
  const [loi, setLoi] = useState(null);
  const chay = async (ham) => {
    setDangChay(true);
    setLoi(null);
    try { await ham(); return true; } catch (e) { setLoi(e); return false; } finally { setDangChay(false); }
  };
  return { chay, dangChay, loi, setLoi };
}

export function HopThoai({ tieuDe, onDong, children, rong }) {
  useEffect(() => {
    const phim = (e) => e.key === 'Escape' && onDong();
    window.addEventListener('keydown', phim);
    return () => window.removeEventListener('keydown', phim);
  }, [onDong]);
  return (
    <div className="nen-hop" onMouseDown={(e) => e.target === e.currentTarget && onDong()}>
      <div className={`hop ${rong ? 'rong' : ''}`} role="dialog" aria-modal="true" aria-label={tieuDe}>
        <div className="hop-dau"><h3>{tieuDe}</h3><button className="nut-x" onClick={onDong} aria-label="Đóng">×</button></div>
        <div className="hop-than">{children}</div>
      </div>
    </div>
  );
}

export const Truong = ({ nhan, children, goiY }) => (
  <label className="truong"><span>{nhan}</span>{children}{goiY && <small>{goiY}</small>}</label>
);

export function TrangThaiTai({ t, children }) {
  if (t.dangTai) return <p className="mo">Đang tải…</p>;
  if (t.loi) return <BaoLoi loi={t.loi} />;
  return children(t.duLieu);
}
