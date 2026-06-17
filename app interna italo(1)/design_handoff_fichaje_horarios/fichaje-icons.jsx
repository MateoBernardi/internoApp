// Shared inline icons for the fichaje app. Exported to window.
const Chev = ({s=22, d="down"}) => {
  const paths = { down:"M6 9l6 6 6-6", left:"M15 6l-6 6 6 6", right:"M9 6l6 6-6 6", up:"M6 15l6-6 6 6" };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d={paths[d]} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
};
const Pin = ({s=16}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8"/></svg>;
const ClockIc = ({s=16}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const Arrow = ({s=22}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const X = ({s=20}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>;
const Check = ({s=46}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SignIn = ({s=24}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M14 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 8l4 4-4 4M14 12H3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SignOut = ({s=24}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M10 3H6a2 2 0 00-2 2v14a2 2 0 002 2h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 8l4 4-4 4M21 12H10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>;

/* navbar glyphs */
const NavHome = ({s=23}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 11l8-6.5L20 11" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 10v9h12v-9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const NavPie = ({s=23}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3a9 9 0 109 9h-9V3z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"/></svg>;
const NavTrend = ({s=23}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 15l5-5 4 3 6-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 19l5-5 4 3 6-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" opacity=".45"/></svg>;
const NavCal = ({s=23}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="15" rx="2.4" stroke="currentColor" strokeWidth="1.9"/><path d="M4 9.5h16M8.5 3.5v3M15.5 3.5v3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>;
const NavQR = ({s=26}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.4" stroke="currentColor" strokeWidth="1.9"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.4" stroke="currentColor" strokeWidth="1.9"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.4" stroke="currentColor" strokeWidth="1.9"/><path d="M14 14h2.5v2.5M20.5 14v6.5M14 20.5h2.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>;

Object.assign(window, { Chev, Pin, ClockIc, Arrow, X, Check, SignIn, SignOut, NavHome, NavPie, NavTrend, NavCal, NavQR });
