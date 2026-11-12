// Gọi API: tự gắn token, ném lỗi kèm thông báo tiếng Việt từ máy chủ.
const KHOA_TOKEN = 'is028_token';

export const layToken = () => localStorage.getItem(KHOA_TOKEN);
export const datToken = (t) => (t ? localStorage.setItem(KHOA_TOKEN, t) : localStorage.removeItem(KHOA_TOKEN));

async function docLoi(res) {
  let duLieu = {};
  try { duLieu = await res.json(); } catch { /* máy chủ không trả JSON */ }
  const loi = new Error(duLieu.message || `Lỗi ${res.status}`);
  loi.status = res.status;
  loi.chiTiet = duLieu.chiTiet; // danh sách lỗi chi tiết (nếu có)
  return loi;
}

// body: object JSON; form: FormData (tải tệp)
export async function api(duongDan, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (layToken()) headers.Authorization = `Bearer ${layToken()}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${duongDan}`, { method, headers, body: form || (body !== undefined ? JSON.stringify(body) : undefined) });
  if (res.status === 401 && layToken()) {
    // phiên hết hạn hoặc tài khoản bị khóa: về trang đăng nhập
    datToken(null);
    window.location.assign('/dang-nhap');
  }
  if (!res.ok) throw await docLoi(res);
  return res.json();
}

// Tải một tệp từ API về máy (cần token nên không dùng thẻ <a> trực tiếp)
export async function taiVe(duongDan, tenTep) {
  const res = await fetch(`/api${duongDan}`, { headers: { Authorization: `Bearer ${layToken()}` } });
  if (!res.ok) throw await docLoi(res);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = tenTep;
  a.click();
  URL.revokeObjectURL(url);
}

// Tải tệp minh chứng
export const taiTep = (maMC, tenTep) => taiVe(`/minhchung/${maMC}/tai`, tenTep);
