import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const Ctx = createContext({ tema: 'light', alternar: () => {} });
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => { try { return localStorage.getItem('theme') || 'light'; } catch { return 'light'; } });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    try { localStorage.setItem('theme', tema); } catch { /* */ }
  }, [tema]);
  const alternar = useCallback(() => setTema((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return <Ctx.Provider value={{ tema, alternar }}>{children}</Ctx.Provider>;
}
