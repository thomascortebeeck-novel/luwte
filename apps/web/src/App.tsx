import { NavLink, Route, Routes, useLocation } from 'react-router';
import styles from './App.module.css';
import { AppNav } from './components/AppNav';
import { useLocale } from './providers/LocaleProvider';
import { Breathing } from './routes/Breathing';
import { Calendar } from './routes/Calendar';
import { CheckIn } from './routes/CheckIn';
import { Grounding } from './routes/Grounding';
import { PermissionLog } from './routes/PermissionLog';
import { Plan } from './routes/Plan';
import { Circle } from './routes/Circle';
import { CircleMember } from './routes/CircleMember';
import { Consent } from './routes/Consent';
import { Admin } from './routes/Admin';
import { FindClinician } from './routes/FindClinician';
import { Console } from './routes/Console';
import { ConsolePatient } from './routes/ConsolePatient';
import { Crisis } from './routes/Crisis';
import { Feed } from './routes/Feed';
import { Following, FollowingCalendar } from './routes/Following';
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
import { Suggestions } from './routes/Suggestions';
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
      <header className={styles.bar}>
        <NavLink to="/" className={styles.wordmark}>
          luwte
        </NavLink>

        {/* Desktop puts the sections here; on a phone the same markup is
            pinned to the bottom, within thumb reach. See AppNav.module.css. */}
        <AppNav />

        {onCrisis ? null : (
          <NavLink to="/crisis" className={styles.crisisLink}>
            {t('navCrisis')}
          </NavLink>
        )}
      </header>
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
          path="/calendar"
          element={
            <Gate>
              <Calendar />
            </Gate>
          }
        />
        {/* The two guided practices. Short, guided, externally focused and
            eyes open — the safe subset for somebody with a psychosis history.
            Neither writes anything: see `practices.ts`. */}
        <Route
          path="/breathing"
          element={
            <Gate>
              <Breathing />
            </Gate>
          }
        />
        <Route
          path="/grounding"
          element={
            <Gate>
              <Grounding />
            </Gate>
          }
        />
        {/* PRD 6.3 — its own screen, never mixed into the calendar. What
            somebody else thinks you should do is an offer, not an entry. */}
        <Route
          path="/suggestions"
          element={
            <Gate>
              <Suggestions />
            </Gate>
          }
        />
        <Route
          path="/feed"
          element={
            <Gate>
              <Feed />
            </Gate>
          }
        />
        {/* Someone else's feed, reachable only if they granted it — the rules
            refuse the read otherwise, so this is navigation, not access. */}
        <Route
          path="/feed/:patientId"
          element={
            <Gate>
              <Feed />
            </Gate>
          }
        />
        <Route
          path="/following"
          element={
            <Gate>
              <Following />
            </Gate>
          }
        />
        <Route
          path="/following/:patientId"
          element={
            <Gate>
              <FollowingCalendar />
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
        {/* The early-warning-signs plan. Their own, or somebody else's if
            they granted it — the rules refuse the read otherwise, so the
            second route is navigation and not access. */}
        <Route
          path="/plan"
          element={
            <Gate>
              <Plan />
            </Gate>
          }
        />
        <Route
          path="/plan/:patientId"
          element={
            <Gate>
              <Plan />
            </Gate>
          }
        />
        {/* Before the :memberUid route, or "log" would be read as a uid. */}
        <Route
          path="/circle/log"
          element={
            <Gate>
              <PermissionLog />
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
        {/* PRD 6.7 / D27 — where a person decides who is a clinician. The
            route is open to anyone signed in and shows nothing to anyone who
            is not an admin; `admins/{uid}` is written only with the Admin SDK
            and the rules refuse every write here to everybody else. */}
        {/* The patient adding their doctor from a code. No new access path:
            the patient writes their own circle, and the rules refuse the card
            unless an admin verified the person the code names. */}
        <Route
          path="/dokter"
          element={
            <Gate>
              <FindClinician />
            </Gate>
          }
        />
        <Route
          path="/admin"
          element={
            <Gate>
              <Admin />
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
