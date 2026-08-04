import { NavLink, Route, Routes, useLocation } from 'react-router';
import styles from './App.module.css';
import { useLocale } from './providers/LocaleProvider';
import { CheckIn } from './routes/CheckIn';
import { Consent } from './routes/Consent';
import { Crisis } from './routes/Crisis';
import { Gate } from './routes/Gate';
import { Medication } from './routes/Medication';
import { Onboarding } from './routes/Onboarding';
import { Settings } from './routes/Settings';
import { SignIn } from './routes/SignIn';
import { Styleguide } from './routes/Styleguide';
import { Today } from './routes/Today';

export function App() {
  const { t } = useLocale();
  const location = useLocation();

  // PRD 6.8 — the crisis screen is never behind more than one tap, from
  // anywhere, signed in or not. The only place the link is not shown is the
  // crisis screen itself.
  const onCrisis = location.pathname === '/crisis';

  return (
    <div className={styles.shell}>
      <nav className={styles.bar}>
        <NavLink to="/" className={styles.wordmark}>
          luwte
        </NavLink>
        {onCrisis ? null : (
          <NavLink to="/crisis" className={styles.crisisLink}>
            {t('navCrisis')}
          </NavLink>
        )}
      </nav>
      <Routes>
        {/* Reachable without an account and without passing the gate. */}
        <Route path="/crisis" element={<Crisis />} />
        <Route path="/styleguide" element={<Styleguide />} />

        <Route
          path="/signin"
          element={
            <Gate>
              <SignIn />
            </Gate>
          }
        />
        <Route
          path="/onboarding"
          element={
            <Gate>
              <Onboarding />
            </Gate>
          }
        />
        <Route
          path="/consent"
          element={
            <Gate>
              <Consent />
            </Gate>
          }
        />
        <Route
          path="/checkin"
          element={
            <Gate>
              <CheckIn />
            </Gate>
          }
        />
        <Route
          path="/medication"
          element={
            <Gate>
              <Medication />
            </Gate>
          }
        />
        <Route
          path="/settings"
          element={
            <Gate>
              <Settings />
            </Gate>
          }
        />
        <Route
          path="/"
          element={
            <Gate>
              <Today />
            </Gate>
          }
        />
      </Routes>
    </div>
  );
}
