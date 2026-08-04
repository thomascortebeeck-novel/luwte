import { NavLink, Route, Routes } from 'react-router';
import styles from './App.module.css';
import { useLocale } from './providers/LocaleProvider';
import { Crisis } from './routes/Crisis';
import { Home } from './routes/Home';
import { Styleguide } from './routes/Styleguide';

export function App() {
  const { t } = useLocale();

  return (
    <div className={styles.shell}>
      <nav className={styles.bar}>
        <NavLink to="/" className={styles.wordmark}>
          luwte
        </NavLink>
        <NavLink to="/crisis" className={styles.crisisLink}>
          {t('navCrisis')}
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/crisis" element={<Crisis />} />
        <Route path="/styleguide" element={<Styleguide />} />
      </Routes>
    </div>
  );
}
