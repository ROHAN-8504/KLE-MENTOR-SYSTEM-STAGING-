import { useRecoilState } from 'recoil';
import { useEffect } from 'react';
import { themeState } from '../store/atoms';

export function useTheme() {
  const [theme, setTheme] = useRecoilState(themeState);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, setTheme, toggleTheme };
}
