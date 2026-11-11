// Ngữ cảnh người dùng đang đăng nhập, dùng chung cho mọi trang.
import { createContext, useContext } from 'react';

export const NguCanh = createContext(null);
export const useNguoi = () => useContext(NguCanh);
