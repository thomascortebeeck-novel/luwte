import { NavLink, Route, Routes, useLocation } from 'react-router';
import styles from './App.module.css';
import { useLocale } from './providers/LocaleProvider';
import { CheckIn } from './routes/CheckIn';
import { Circle } from './routes/Circle';
import { CircleMember } from './routes/CircleMember';
import { Consent } from './routes/Consent';
import { Console } from './routes/Console';
import { ConsolePatient } from './routes/ConsolePatient';
import { Crisis } from './routes/Crisis';
import { Gate } from './routes/Gate';
import { Insights } from './routes/Insights';
import { Invite } from './routes/Invite';
import { Join } from './routes/Join';
import { Medication } from './routes/Medication';
import { Report } from './routes/Report';
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

        {/* Outside the gate on purpose: the gate would redirect someone who
            is signed out and the code in the link would be lost. Join holds
            it across sign-in itself. */}
        <Route path="/join/:code" element={<Join />} />

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
          path="/insights"
          element={
            <Gate>
              <Insights />
            </Gate>
          }
        />
        <Route
          path="/report"
          element={
            <Gate>
              <Report />
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
          path="/circle"
          element={
            <Gate>
              <Circle />
            </Gate>
          }
        />
        <Route
          path="/circle/invite"
          element={
            <Gate>
              <Invite />
            </Gate>
          }
        />
        <Route
          path="/circle/:memberUid"
          element={
            <Gate>
              <CircleMember />
            </Gate>
          }
        />

        {/* PRD 6.7. The gate here is only about what is offered: every read
            still resolves through the circle, and the rules refuse a
            medication write from anyone the admin has not verified. */}
        <Route
          path="/console"
          element={
            <Gate>
              <Console />
            </Gate>
          }
        />
        <Route
          path="/console/:patientId"
          element={
            <Gate>
              <ConsolePatient />
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
