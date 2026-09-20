import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home, Calendar, BarChart3, Landmark, ScrollText, RefreshCw, ChevronLeft, ChevronRight, X, Radio,
} from 'lucide-react';

// ESPN's public API blocks direct browser calls (no CORS headers) — route
// through our own serverless proxy instead. `path` is the part after the
// espn.com host, e.g. '/apis/site/v2/sports/football/nfl/scoreboard'.
const espnFetch = (path) => fetch(`/.netlify/functions/espn?path=${encodeURIComponent(path)}`).then(r => r.json());

// ─── Design tokens ──────────────────────────────────────────────────────────
const INK = 'var(--text)';
const ACCENT = '#013369';
const BRAND = '#d50a0a';
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
const SHADOW = {
  sm: '0 1px 2px rgba(15,23,42,0.05)',
  md: '0 6px 20px rgba(15,23,42,0.07)',
  lg: '0 20px 50px rgba(15,23,42,0.14)',
};
const LINE = 'var(--border)';
const LINE2 = 'var(--border2)';

const THEME_VARS = {
  bg: '#f6f7fb', surface: '#ffffff', surface2: '#f3f5f9',
  border: 'rgba(15,23,42,0.09)', border2: 'rgba(15,23,42,0.16)',
  text: '#0f172a', text2: '#475569', text3: '#64748b', text4: '#94a3b8',
  hover: '#f1f5fb',
};

const GLOBAL_CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: #f6f7fb;
    color: #0f172a;
    font-size: 13px;
  }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(15,23,42,0.18); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(15,23,42,0.28); }
  button { font-family: inherit; }
`;

const S = {
  app: { minHeight: '100vh', background: 'var(--bg)', color: INK, fontFamily: "'Inter', system-ui, sans-serif" },
  header: {
    background: 'var(--surface)', borderBottom: `1px solid ${LINE}`,
    padding: '11px 20px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50,
    flexWrap: 'wrap', gap: 8, boxShadow: SHADOW.sm,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  pageTitle: { fontSize: 17, fontWeight: 700, margin: 0, color: INK, letterSpacing: '0.2px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  btnGray: { padding: '6px 13px', background: 'var(--surface)', border: `1px solid ${LINE2}`, borderRadius: RADIUS.sm, color: INK, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 },
  btnBlue: { padding: '6px 13px', background: ACCENT, border: 'none', borderRadius: RADIUS.sm, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  body: { maxWidth: 1400, margin: '0 auto', padding: '18px 16px' },
  bodyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  sectionTitle: { fontSize: 19, fontWeight: 700, margin: 0, color: INK, letterSpacing: '-0.2px' },
  card: { background: 'var(--surface)', border: `1px solid ${LINE}`, borderRadius: RADIUS.lg, overflow: 'hidden', boxShadow: SHADOW.sm },
  cardLabel: { fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '10px 16px', background: 'var(--surface2)', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 6 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, overflowY: 'auto', padding: '24px 12px' },
  modal: { background: 'var(--surface)', borderRadius: RADIUS.lg, width: '100%', maxWidth: 760, boxShadow: SHADOW.lg, overflow: 'hidden' },
  modalClose: { background: 'var(--surface2)', border: `1px solid ${LINE2}`, color: 'var(--text2)', fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: 6, borderRadius: RADIUS.sm, display: 'flex' },
};

// ─── NFL structure (stable across seasons) ─────────────────────────────────
const NFL_DIVISIONS = {
  BUF: 'AFC East', MIA: 'AFC East', NE: 'AFC East', NYJ: 'AFC East',
  BAL: 'AFC North', CIN: 'AFC North', CLE: 'AFC North', PIT: 'AFC North',
  HOU: 'AFC South', IND: 'AFC South', JAX: 'AFC South', TEN: 'AFC South',
  DEN: 'AFC West', KC: 'AFC West', LAC: 'AFC West', LV: 'AFC West',
  DAL: 'NFC East', NYG: 'NFC East', PHI: 'NFC East', WSH: 'NFC East',
  CHI: 'NFC North', DET: 'NFC North', GB: 'NFC North', MIN: 'NFC North',
  ATL: 'NFC South', CAR: 'NFC South', NO: 'NFC South', TB: 'NFC South',
  ARI: 'NFC West', LAR: 'NFC West', SF: 'NFC West', SEA: 'NFC West',
};
const DIV_ORDER = ['AFC East', 'AFC North', 'AFC South', 'AFC West', 'NFC East', 'NFC North', 'NFC South', 'NFC West'];

const NFL_QUOTES = [
  { quote: "Winning isn't everything, but wanting to win is.", author: 'Vince Lombardi' },
  { quote: "The measure of who we are is what we do with what we have.", author: 'Vince Lombardi' },
  { quote: "Perfection is not attainable, but if we chase perfection we can catch excellence.", author: 'Vince Lombardi' },
  { quote: "Pressure is something you feel when you don't know what the hell you're doing.", author: 'Peyton Manning' },
  { quote: "I've learned that something constructive comes from every defeat.", author: 'Tom Landry' },
  { quote: "It's not whether you get knocked down, it's whether you get up.", author: 'Vince Lombardi' },
  { quote: "Do your job.", author: 'Bill Belichick' },
  { quote: "We're on to Cincinnati.", author: 'Bill Belichick' },
  { quote: "I'm just a small-town kid who got a chance to do what he loves.", author: 'Tom Brady' },
  { quote: "Football is a game played with arms, legs and shoulders but mostly from the neck up.", author: 'Knute Rockne' },
  { quote: "The only way to prove you are a good sport is to lose.", author: 'Ernie Banks' },
  { quote: "You find out a lot about a team's character when they lose.", author: 'Joe Paterno' },
  { quote: "Football is not a contact sport, it is a collision sport. Dancing is a contact sport.", author: 'Duffy Daugherty' },
  { quote: "The will to win is important, but the will to prepare is vital.", author: 'Joe Paterno' },
  { quote: "You can't turn a good performance in on Sunday unless you practice good performances Monday through Saturday.", author: 'Chuck Noll' },
  { quote: "Iron sharpens iron.", author: 'Ray Lewis' },
  { quote: "Excuses are the nails used to build a house of failure.", author: 'Don Shula' },
  { quote: "I firmly believe that any man's finest hour is that moment when he has worked his heart out for a cause.", author: 'Vince Lombardi' },
  { quote: "You have to perform at a consistently higher level than others. That's the mark of a true professional.", author: 'Joe Montana' },
  { quote: "Champions are made from something they have deep inside them: a desire, a dream, a vision.", author: 'Muhammad Ali' },
];
function quoteOfTheDay() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - startOfYear) / 86400000);
  return NFL_QUOTES[dayOfYear % NFL_QUOTES.length];
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const logoFor = (team) => team?.logos?.[0]?.href ?? team?.logo ?? '';
const statFrom = (entry, type) => entry.stats?.find(s => s.type === type)?.displayValue ?? '—';

function NflBadge({ size = 20 }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: ACCENT, color: '#fff', fontWeight: 900, fontSize: size * 0.5,
      letterSpacing: '0.02em', borderRadius: 6, padding: `${size * 0.18}px ${size * 0.32}px`,
      border: `2px solid ${BRAND}`,
    }}>
      NFL
    </span>
  );
}

// ─── Game Card ──────────────────────────────────────────────────────────────
function gameStatusText(event) {
  const t = event.status?.type;
  if (!t) return '';
  if (t.state === 'pre') {
    return new Date(event.date).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  }
  if (t.state === 'in') return t.shortDetail || 'In Progress';
  return t.detail?.includes('OT') ? 'FINAL/OT' : 'FINAL';
}

function TeamLine({ competitor, showScore, winner, hasBall }) {
  const team = competitor.team;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img src={logoFor(team)} style={{ width: 28, height: 28, objectFit: 'contain', display: 'block' }} alt="" />
          {hasBall && <span style={{ position: 'absolute', bottom: -2, right: -4, width: 8, height: 8, borderRadius: '50%', background: BRAND, border: '1.5px solid var(--surface)' }} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: winner ? 900 : 700, fontSize: 15, color: winner ? 'var(--text)' : 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {team.displayName}
          </div>
          {competitor.records?.[0]?.summary && (
            <div style={{ fontSize: 11, color: 'var(--text4)' }}>{competitor.records[0].summary}</div>
          )}
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'ui-monospace, monospace', color: winner ? ACCENT : 'var(--text)', flexShrink: 0, marginLeft: 8 }}>
        {showScore ? competitor.score : <span style={{ fontSize: 12, color: 'var(--text4)' }}>—</span>}
      </div>
    </div>
  );
}

function GameCard({ event, onClick }) {
  const comp = event.competitions?.[0];
  const home = comp?.competitors?.find(c => c.homeAway === 'home');
  const away = comp?.competitors?.find(c => c.homeAway === 'away');
  const completed = event.status?.type?.completed;
  const isLive = event.status?.type?.state === 'in';
  const homeWin = completed && Number(home?.score) > Number(away?.score);
  const awayWin = completed && Number(away?.score) > Number(home?.score);

  return (
    <div onClick={onClick} style={{ ...S.card, padding: '12px 14px', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = SHADOW.md; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = SHADOW.sm; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase',
          color: isLive ? '#fff' : 'var(--text3)', background: isLive ? BRAND : 'var(--surface2)',
          padding: '2px 8px', borderRadius: RADIUS.pill,
        }}>
          {isLive && <Radio size={9} />} {gameStatusText(event)}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
          {comp?.venue?.fullName}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <TeamLine competitor={away} showScore={completed || isLive} winner={awayWin} hasBall={isLive && comp?.situation?.possession === away?.team?.id} />
        <TeamLine competitor={home} showScore={completed || isLive} winner={homeWin} hasBall={isLive && comp?.situation?.possession === home?.team?.id} />
      </div>
      {isLive && comp?.situation?.downDistanceText && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${LINE}`, fontSize: 10, color: 'var(--text3)', display: 'flex', gap: 5, alignItems: 'center' }}>
          <span style={{ fontWeight: 800, color: BRAND, fontSize: 9 }}>▶</span>
          <span>{comp.situation.downDistanceText}</span>
          {comp.situation.isRedZone && <span style={{ fontWeight: 800, color: '#ef4444' }}>Red Zone</span>}
        </div>
      )}
    </div>
  );
}

// ─── Standings ──────────────────────────────────────────────────────────────
function DivisionTable({ name, entries }) {
  const th = { padding: '3px 4px', fontSize: 9, fontWeight: 800, color: 'var(--text3)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' };
  const td = { padding: '2px 4px', fontSize: 11, fontFamily: 'ui-monospace, monospace', textAlign: 'center', color: 'var(--text2)' };
  const sorted = [...entries].sort((a, b) => Number(statFrom(b, 'wins')) - Number(statFrom(a, 'wins')) || Number(statFrom(a, 'losses')) - Number(statFrom(b, 'losses')));

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${LINE}`, borderRadius: RADIUS.sm, overflow: 'hidden' }}>
      <div style={{ padding: '5px 8px', fontSize: 11, fontWeight: 800, color: '#fff', background: name.startsWith('AFC') ? ACCENT : BRAND }}>{name}</div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ background: 'var(--surface2)', borderBottom: `1px solid ${LINE}` }}>
            <th style={{ ...th, textAlign: 'left', paddingLeft: 8 }}>Team</th>
            <th style={th}>W</th><th style={th}>L</th><th style={th}>T</th>
            <th style={th}>PCT</th><th style={th}>PF</th><th style={th}>PA</th><th style={th}>STRK</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e, i) => (
            <tr key={e.team.id} style={{ borderTop: i === 0 ? 'none' : `1px solid ${LINE}` }}>
              <td style={{ padding: '3px 4px 3px 8px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                <img src={logoFor(e.team)} style={{ width: 14, height: 14, objectFit: 'contain' }} alt="" />
                {e.team.abbreviation}
              </td>
              <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }}>{statFrom(e, 'wins')}</td>
              <td style={td}>{statFrom(e, 'losses')}</td>
              <td style={td}>{statFrom(e, 'ties')}</td>
              <td style={td}>{statFrom(e, 'winpercent')}</td>
              <td style={td}>{statFrom(e, 'pointsfor')}</td>
              <td style={td}>{statFrom(e, 'pointsagainst')}</td>
              <td style={td}>{statFrom(e, 'streak')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StandingsGrid({ standings }) {
  if (!standings) return <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text4)' }}>Loading standings...</p>;
  const byDiv = {};
  standings.forEach(conf => {
    (conf.standings?.entries ?? []).forEach(entry => {
      const div = NFL_DIVISIONS[entry.team.abbreviation];
      if (!div) return;
      (byDiv[div] ??= []).push(entry);
    });
  });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
      {DIV_ORDER.map(name => byDiv[name] && <DivisionTable key={name} name={name} entries={byDiv[name]} />)}
    </div>
  );
}

// ─── Teams ──────────────────────────────────────────────────────────────────
function TeamsGrid({ teams }) {
  if (!teams) return <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text4)' }}>Loading teams...</p>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
      {teams.map(({ team }) => (
        <div key={team.id} style={{ ...S.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: `4px solid #${team.color || '013369'}` }}>
          <img src={logoFor(team)} style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} alt="" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.displayName}</div>
            <div style={{ fontSize: 11, color: 'var(--text4)' }}>{NFL_DIVISIONS[team.abbreviation] ?? ''}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Home ───────────────────────────────────────────────────────────────────
function HomePage({ standings, weekGames, week, onGameClick }) {
  const todayQuote = useMemo(() => quoteOfTheDay(), []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)', gap: 20, alignItems: 'start' }}>
      <div>
        <StandingsGrid standings={standings} />
        <div style={{ ...S.card, marginTop: 14 }}>
          <div style={S.cardLabel}><ScrollText size={13} /> Quote of the Day</div>
          <div style={{ padding: 16 }}>
            <p style={{ margin: 0, fontSize: 14, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.5 }}>&ldquo;{todayQuote.quote}&rdquo;</p>
            <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 700, color: ACCENT, textAlign: 'right' }}>— {todayQuote.author}</p>
          </div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardLabel}><Calendar size={13} /> Week {week ?? ''} Games</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {(weekGames ?? []).map(event => {
            const comp = event.competitions?.[0];
            const home = comp?.competitors?.find(c => c.homeAway === 'home');
            const away = comp?.competitors?.find(c => c.homeAway === 'away');
            const completed = event.status?.type?.completed;
            const isLive = event.status?.type?.state === 'in';
            return (
              <div key={event.id} onClick={() => onGameClick(event)}
                style={{ padding: '9px 16px', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 12 }}>
                  <img src={logoFor(away?.team)} style={{ width: 16, height: 16, objectFit: 'contain' }} alt="" />
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{away?.team.abbreviation}</span>
                  <span style={{ color: 'var(--text4)' }}>@</span>
                  <img src={logoFor(home?.team)} style={{ width: 16, height: 16, objectFit: 'contain' }} alt="" />
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{home?.team.abbreviation}</span>
                </div>
                <div style={{ fontSize: 11, color: isLive ? BRAND : 'var(--text3)', fontWeight: isLive ? 700 : 400, flexShrink: 0, fontFamily: 'ui-monospace, monospace' }}>
                  {completed ? `${away?.score}–${home?.score}` : gameStatusText(event)}
                </div>
              </div>
            );
          })}
          {(!weekGames || weekGames.length === 0) && (
            <p style={{ padding: 16, color: 'var(--text4)', fontSize: 12, textAlign: 'center' }}>No games found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Games page ─────────────────────────────────────────────────────────────
function GamesPage({ games, week, onPrevWeek, onNextWeek, onGameClick }) {
  return (
    <div>
      <div style={S.bodyHeader}>
        <h2 style={{ ...S.sectionTitle }}>Games</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={S.btnGray} onClick={onPrevWeek}><ChevronLeft size={13} /> Prev</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 70, textAlign: 'center' }}>Week {week ?? ''}</span>
          <button style={S.btnGray} onClick={onNextWeek}>Next <ChevronRight size={13} /></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {(games ?? []).map(event => <GameCard key={event.id} event={event} onClick={() => onGameClick(event)} />)}
        {games && games.length === 0 && <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text4)' }}>No games this week.</p>}
      </div>
    </div>
  );
}

// ─── Game Modal (gamecast: win prob, team stats, player stats, drives) ─────
const GAME_STAT_ROWS = [
  ['firstDowns', '1st Downs'], ['totalYards', 'Total Yards'], ['netPassingYards', 'Pass Yards'],
  ['rushingYards', 'Rush Yards'], ['thirdDownEff', '3rd Down'], ['turnovers', 'Turnovers'],
  ['totalPenaltiesYards', 'Penalties'], ['possessionTime', 'Possession'],
];

function GameStatsCompare({ boxAway, boxHome }) {
  if (!boxAway || !boxHome) return null;
  const statOf = (box, name) => box.statistics?.find(s => s.name === name)?.displayValue ?? '—';
  return (
    <div>
      {GAME_STAT_ROWS.map(([name, label]) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${LINE}`, fontSize: 12 }}>
          <span style={{ flex: 1, textAlign: 'right', fontWeight: 700, color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>{statOf(boxAway, name)}</span>
          <span style={{ width: 130, textAlign: 'center', color: 'var(--text4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
          <span style={{ flex: 1, textAlign: 'left', fontWeight: 700, color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>{statOf(boxHome, name)}</span>
        </div>
      ))}
    </div>
  );
}

function WinProbBar({ winprobability, awayTeam, homeTeam }) {
  const last = winprobability?.[winprobability.length - 1];
  if (!last) return null;
  const homePct = Math.round(last.homeWinPercentage * 100);
  const awayPct = 100 - homePct;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 5 }}>
        <span style={{ color: 'var(--text)' }}>{awayTeam?.abbreviation} {awayPct}%</span>
        <span style={{ color: 'var(--text3)' }}>Win Probability</span>
        <span style={{ color: 'var(--text)' }}>{homePct}% {homeTeam?.abbreviation}</span>
      </div>
      <div style={{ display: 'flex', height: 8, borderRadius: RADIUS.pill, overflow: 'hidden' }}>
        <div style={{ width: `${awayPct}%`, background: `#${awayTeam?.color || '64748b'}` }} />
        <div style={{ width: `${homePct}%`, background: `#${homeTeam?.color || ACCENT.slice(1)}` }} />
      </div>
    </div>
  );
}

const PLAYER_CATEGORIES = ['passing', 'rushing', 'receiving'];

function PlayerStatCategory({ category }) {
  if (!category?.athletes?.length) return null;
  const th = { padding: '3px 5px', fontSize: 9, fontWeight: 800, color: 'var(--text3)', textAlign: 'center', textTransform: 'uppercase' };
  const td = { padding: '3px 5px', fontSize: 11, fontFamily: 'ui-monospace, monospace', textAlign: 'center', color: 'var(--text2)' };
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 10 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${LINE}` }}>
          <th style={{ ...th, textAlign: 'left' }}>{category.text}</th>
          {category.labels.map(l => <th key={l} style={th}>{l}</th>)}
        </tr>
      </thead>
      <tbody>
        {category.athletes.map(a => (
          <tr key={a.athlete.id}>
            <td style={{ padding: '3px 5px', fontSize: 11, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{a.athlete.displayName}</td>
            {a.stats.map((s, i) => <td key={i} style={td}>{s}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TeamPlayerStats({ abbr, teamId, playersByTeam }) {
  const teamStats = playersByTeam?.find(t => t.team.id === teamId);
  if (!teamStats) return null;
  const cats = PLAYER_CATEGORIES.map(name => teamStats.statistics?.find(s => s.name === name)).filter(c => c?.athletes?.length);
  if (cats.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{abbr}</div>
      {cats.map(c => <PlayerStatCategory key={c.name} category={c} />)}
    </div>
  );
}

function PlayByPlay({ drives }) {
  const items = [];
  for (const drive of [...(drives?.previous ?? [])].reverse()) {
    for (const play of [...(drive.plays ?? [])].reverse()) {
      items.push({ play, team: drive.team });
    }
  }
  if (items.length === 0) return (
    <p style={{ color: 'var(--text4)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>No plays yet.</p>
  );
  return (
    <div>
      {items.map(({ play, team }) => (
        <div key={play.id} style={{ padding: '8px 0', borderBottom: `1px solid ${LINE}`, display: 'flex', gap: 10 }}>
          <img src={logoFor(team)} style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0, marginTop: 2 }} alt="" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'ui-monospace, monospace' }}>
                Q{play.period?.number} {play.clock?.displayValue}
              </span>
              {play.type?.text && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>{play.type.text}</span>
              )}
              {play.scoringPlay && (
                <span style={{ fontSize: 9, fontWeight: 800, background: BRAND, color: '#fff', padding: '1px 5px', borderRadius: RADIUS.pill }}>
                  {play.awayScore}–{play.homeScore}
                </span>
              )}
              {play.statYardage != null && play.statYardage !== 0 && (
                <span style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: play.statYardage > 0 ? '#22c55e' : '#ef4444', marginLeft: 'auto' }}>
                  {play.statYardage > 0 ? '+' : ''}{play.statYardage} yds
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.4 }}>{play.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DrivesFeed({ drives }) {
  const list = [...(drives?.previous ?? [])].reverse();
  if (list.length === 0) return <p style={{ color: 'var(--text4)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>No drive data yet.</p>;
  return (
    <div>
      {list.map(d => (
        <div key={d.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${LINE}` }}>
          <img src={logoFor(d.team)} style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0, marginTop: 1 }} alt="" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: d.isScore ? BRAND : 'var(--text)' }}>
              {d.team?.shortDisplayName} — {d.displayResult}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text4)' }}>{d.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GameModal({ event, onClose }) {
  const [summary, setSummary] = useState(null);
  const isLive = event.status?.type?.state === 'in';

  useEffect(() => {
    const load = () => espnFetch(`/apis/site/v2/sports/football/nfl/summary?event=${event.id}`).then(setSummary).catch(() => {});
    load();
    if (!isLive) return;
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [event.id, isLive]);

  const comp = event.competitions?.[0];
  const home = comp?.competitors?.find(c => c.homeAway === 'home');
  const away = comp?.competitors?.find(c => c.homeAway === 'away');
  const completed = event.status?.type?.completed;
  const showScore = completed || isLive;

  const boxTeams = summary?.boxscore?.teams ?? [];
  const boxAway = boxTeams.find(t => t.team.id === away?.team.id);
  const boxHome = boxTeams.find(t => t.team.id === home?.team.id);
  const playersByTeam = summary?.boxscore?.players ?? [];

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${LINE}`, position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800,
              letterSpacing: '0.05em', textTransform: 'uppercase', color: isLive ? '#fff' : 'var(--text3)',
              background: isLive ? BRAND : 'var(--surface2)', padding: '2px 8px', borderRadius: RADIUS.pill,
            }}>
              {isLive && <Radio size={9} />} {gameStatusText(event)}
            </span>
            <button style={S.modalClose} onClick={onClose}><X size={14} /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 12 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <img src={logoFor(away?.team)} style={{ width: 40, height: 40, objectFit: 'contain', marginBottom: 4 }} alt="" />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{away?.team.displayName}</div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'ui-monospace, monospace', color: 'var(--text)', flexShrink: 0 }}>
              {showScore ? `${away?.score}–${home?.score}` : 'vs'}
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <img src={logoFor(home?.team)} style={{ width: 40, height: 40, objectFit: 'contain', marginBottom: 4 }} alt="" />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{home?.team.displayName}</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>{comp?.venue?.fullName}</div>
        </div>

        <div style={{ padding: '16px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {!summary && <p style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text4)', fontSize: 12 }}>Loading gamecast...</p>}
          {summary && (
            <>
              {(isLive || completed) && (
                <WinProbBar winprobability={summary.winprobability} awayTeam={away?.team} homeTeam={home?.team} />
              )}
              {boxAway && boxHome && (
                <div style={{ marginBottom: 18 }}>
                  <div style={S.cardLabel}>Team Stats</div>
                  <GameStatsCompare boxAway={boxAway} boxHome={boxHome} />
                </div>
              )}
              {playersByTeam.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={S.cardLabel}>Player Stats</div>
                  <div style={{ marginTop: 10 }}>
                    <TeamPlayerStats abbr={away?.team.abbreviation} teamId={away?.team.id} playersByTeam={playersByTeam} />
                    <TeamPlayerStats abbr={home?.team.abbreviation} teamId={home?.team.id} playersByTeam={playersByTeam} />
                  </div>
                </div>
              )}
              {(isLive || completed) && summary.drives && (
                <div style={{ marginBottom: 18 }}>
                  <div style={S.cardLabel}>Drives</div>
                  <div style={{ marginTop: 6 }}><DrivesFeed drives={summary.drives} /></div>
                </div>
              )}
              {(isLive || completed) && summary.drives && (
                <div>
                  <div style={S.cardLabel}>Play by Play</div>
                  <div style={{ marginTop: 6 }}><PlayByPlay drives={summary.drives} /></div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [mainTab, setMainTab] = useState('home');
  const [season, setSeason] = useState(null); // { year, type }
  const [week, setWeek] = useState(null);
  const [games, setGames] = useState(null);
  const [standings, setStandings] = useState(null);
  const [teams, setTeams] = useState(null);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  // Derived (not a snapshot) so the modal's header score/status stays in
  // sync as `games` gets silently refreshed by the 20s poll.
  const selectedGame = games?.find(g => g.id === selectedGameId) ?? null;

  useEffect(() => {
    const root = document.documentElement;
    Object.entries({
      '--bg': THEME_VARS.bg, '--surface': THEME_VARS.surface, '--surface2': THEME_VARS.surface2,
      '--border': THEME_VARS.border, '--border2': THEME_VARS.border2,
      '--text': THEME_VARS.text, '--text2': THEME_VARS.text2, '--text3': THEME_VARS.text3, '--text4': THEME_VARS.text4,
      '--hover': THEME_VARS.hover,
    }).forEach(([k, v]) => root.style.setProperty(k, v));
    document.body.style.background = THEME_VARS.bg;
    document.body.style.color = THEME_VARS.text;

    const styleId = 'nfl-global-css';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = GLOBAL_CSS;
      document.head.appendChild(style);
    }
  }, []);

  // Initial scoreboard load — discover current week/season from ESPN.
  useEffect(() => {
    espnFetch('/apis/site/v2/sports/football/nfl/scoreboard')
      .then(d => {
        setGames(d.events ?? []);
        setLastRefresh(new Date());
        setWeek(d.week?.number ?? 1);
        setSeason({ year: d.season?.year ?? new Date().getFullYear(), type: d.season?.type ?? 2 });
      })
      .catch(() => {});
  }, []);

  // Refetch games whenever week/season changes (after the initial discovery).
  useEffect(() => {
    if (!season || week == null) return;
    espnFetch(`/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=${season.type}&year=${season.year}`)
      .then(d => { setGames(d.events ?? []); setLastRefresh(new Date()); })
      .catch(() => {});
  }, [season, week]);

  // Live score polling: silently refetch the currently-viewed week every 20s
  // so in-progress games update without a manual refresh. Refs avoid a stale
  // week/season closure inside the interval callback.
  const seasonRef = useRef(season);
  const weekRef = useRef(week);
  useEffect(() => { seasonRef.current = season; }, [season]);
  useEffect(() => { weekRef.current = week; }, [week]);
  useEffect(() => {
    const id = setInterval(() => {
      const s = seasonRef.current;
      const w = weekRef.current;
      if (!s || w == null) return;
      espnFetch(`/apis/site/v2/sports/football/nfl/scoreboard?week=${w}&seasontype=${s.type}&year=${s.year}`)
        .then(d => { setGames(d.events ?? []); setLastRefresh(new Date()); })
        .catch(() => {});
    }, 20_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    espnFetch('/apis/v2/sports/football/nfl/standings')
      .then(d => setStandings(d.children ?? []))
      .catch(() => {});
    espnFetch('/apis/site/v2/sports/football/nfl/teams?limit=40')
      .then(d => setTeams(d.sports?.[0]?.leagues?.[0]?.teams ?? []))
      .catch(() => {});
  }, []);

  const changeWeek = (delta) => setWeek(w => Math.max(1, (w ?? 1) + delta));

  const tabs = [
    ['home', <><Home size={13} /> Home</>],
    ['games', <><Calendar size={13} /> Games</>],
    ['standings', <><BarChart3 size={13} /> Standings</>],
    ['teams', <><Landmark size={13} /> Teams</>],
  ];

  return (
    <div style={S.app}>
      <header style={S.header}>
        <div style={S.headerLeft}>
          <NflBadge size={22} />
          <h1 style={S.pageTitle}>Dashboard</h1>
        </div>
        <div style={S.headerRight}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
            <button style={S.btnBlue} onClick={() => window.location.reload()}><RefreshCw size={13} /> Refresh</button>
            {lastRefresh && (
              <span style={{ fontSize: 10, color: 'var(--text4)' }}>
                Last refresh: {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </header>

      <div style={{ background: 'var(--surface)', borderBottom: `1px solid ${LINE}`, display: 'flex', gap: 2, padding: '0 16px', position: 'sticky', top: 49, zIndex: 40, boxShadow: SHADOW.sm, overflowX: 'auto' }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setMainTab(id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            borderBottom: `2px solid ${mainTab === id ? ACCENT : 'transparent'}`, cursor: 'pointer',
            padding: '11px 14px', fontSize: 12, fontWeight: 700,
            color: mainTab === id ? ACCENT : 'var(--text)', letterSpacing: '0.15px', fontFamily: 'inherit', flexShrink: 0,
          }}>{label}</button>
        ))}
      </div>

      <div style={S.body}>
        {mainTab === 'home' && (
          <HomePage standings={standings} weekGames={games} week={week} onGameClick={(e) => setSelectedGameId(e.id)} />
        )}
        {mainTab === 'games' && (
          <GamesPage games={games} week={week} onPrevWeek={() => changeWeek(-1)} onNextWeek={() => changeWeek(1)} onGameClick={(e) => setSelectedGameId(e.id)} />
        )}
        {mainTab === 'standings' && (
          <div>
            <div style={S.bodyHeader}><h2 style={{ ...S.sectionTitle }}>Standings</h2></div>
            <StandingsGrid standings={standings} />
          </div>
        )}
        {mainTab === 'teams' && (
          <div>
            <div style={S.bodyHeader}><h2 style={{ ...S.sectionTitle }}>Teams</h2></div>
            <TeamsGrid teams={teams} />
          </div>
        )}
      </div>

      {selectedGame && <GameModal event={selectedGame} onClose={() => setSelectedGameId(null)} />}
    </div>
  );
}
