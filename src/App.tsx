import { useEffect } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router';
import { Brand } from './config/brand';
import { BrandMark, Icon } from './components/Icon';
import { useProgress } from './state/progress';
import { Home } from './screens/Home';
import { Onboarding } from './screens/Onboarding';
import { Arcade } from './screens/Arcade';
import { Subjects, SubjectDetail } from './screens/Subjects';
import { Review } from './screens/Review';
import { Profile } from './screens/Profile';
import { Learn } from './screens/Learn';
import { Dashboard } from './screens/Dashboard';
import { About } from './screens/About';
import { Play } from './screens/Play';

const TABS = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/arcade', label: 'Arcade', icon: 'arcade' },
  { to: '/subjects', label: 'Subjects', icon: 'subjects' },
  { to: '/review', label: 'Review', icon: 'review' },
  { to: '/profile', label: 'Profile', icon: 'profile' },
] as const;

function useThemeAttributes() {
  const theme = useProgress((s) => s.profile.theme);
  const reduceMotion = useProgress((s) => s.profile.reduceMotion);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    root.dataset.reduceMotion = String(reduceMotion);
  }, [theme, reduceMotion]);
}

export function App() {
  useThemeAttributes();
  const onboarded = useProgress((s) => s.profile.onboarded);
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!onboarded && pathname !== '/welcome') return <Navigate to="/welcome" replace />;
  if (pathname === '/welcome') return <Onboarding />;

  return (
    <div className="shell">
      <a href="#main" className="sr-only">Skip to content</a>
      <nav className="sidebar" aria-label="Main">
        <NavLink to="/" className="brand">
          <BrandMark /> {Brand.name}
        </NavLink>
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={'end' in t} className="side-link">
            <Icon name={t.icon} /> {t.label}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <NavLink to="/progress" className="side-link">
          <Icon name="chart" /> Dashboard
        </NavLink>
        <NavLink to="/about" className="side-link">
          <Icon name="bookmark" /> Content & sources
        </NavLink>
      </nav>
      <main id="main" className="main">
        <div className="topbar">
          <NavLink to="/" className="brand">
            <BrandMark size={28} /> {Brand.name}
          </NavLink>
        </div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/arcade" element={<Arcade />} />
          <Route path="/play/:gameId" element={<Play />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/subjects/:kind/:id" element={<SubjectDetail />} />
          <Route path="/review" element={<Review />} />
          <Route path="/learn/:conceptId" element={<Learn />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/progress" element={<Dashboard />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={'end' in t} className="tab">
            <Icon name={t.icon} size={22} />
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
