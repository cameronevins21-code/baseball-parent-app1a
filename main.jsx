import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Play, Radio, Plus, Minus, RotateCcw, Shirt, LogOut } from 'lucide-react';
import './styles.css';

const emptyInnings = Array.from({ length: 6 }, () => ({ home: 0, away: 0 }));
const statLabels = {
  atBats: 'AB',
  hits: 'H',
  runs: 'R',
  rbis: 'RBI',
  walks: 'BB',
  strikeouts: 'SO'
};
const emptyStats = {
  atBats: 0,
  hits: 0,
  runs: 0,
  rbis: 0,
  walks: 0,
  strikeouts: 0
};
const starterPlayers = [
  { id: 1, name: 'Avery Johnson', jerseyNumber: '7', stats: { ...emptyStats } },
  { id: 2, name: 'Mason Lee', jerseyNumber: '12', stats: { ...emptyStats } }
];
const starterSchedule = [
  { id: 1, date: '2026-06-01', time: '6:00 PM', opponent: 'Sharks', location: 'Field 2' },
  { id: 2, date: '2026-06-08', time: '6:00 PM', opponent: 'Hawks', location: 'Main Diamond' }
];
const emptyPermissions = {
  scoring: false,
  roster: false,
  stats: false,
  livestream: false
};

function normalizePlayers(players) {
  return players.map(player => ({
    ...player,
    stats: { ...emptyStats, ...player.stats }
  }));
}

function loadSeasonPlayers() {
  try {
    const savedPlayers = JSON.parse(localStorage.getItem('baseballSeasonPlayers'));
    return Array.isArray(savedPlayers) ? normalizePlayers(savedPlayers) : starterPlayers;
  } catch {
    return starterPlayers;
  }
}

function loadSchedule() {
  try {
    const savedSchedule = JSON.parse(localStorage.getItem('baseballSeasonSchedule'));
    return Array.isArray(savedSchedule) ? savedSchedule : starterSchedule;
  } catch {
    return starterSchedule;
  }
}

function loadParentProfile() {
  try {
    const savedProfile = JSON.parse(localStorage.getItem('baseballParentProfile'));
    return savedProfile?.name && savedProfile?.role ? savedProfile : null;
  } catch {
    return null;
  }
}

function loadTeamSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem('baseballTeamSettings'));
    return savedSettings?.teamName && savedSettings?.teamCode
      ? savedSettings
      : { teamName: 'Tigers', teamCode: '' };
  } catch {
    return { teamName: 'Tigers', teamCode: '' };
  }
}

function createAccessCode(teamCode, permissions) {
  const payload = JSON.stringify({
    teamCode,
    permissions,
    createdAt: Date.now()
  });
  return btoa(payload);
}

function readAccessCode(code) {
  try {
    return JSON.parse(atob(code.trim()));
  } catch {
    return null;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [parentProfile, setParentProfile] = useState(loadParentProfile);
  const [teamSettings, setTeamSettings] = useState(loadTeamSettings);
  const [authMode, setAuthMode] = useState('choose');
  const [loginForm, setLoginForm] = useState({
    name: '',
    passcode: '',
    teamName: loadTeamSettings().teamName
  });
  const [loginError, setLoginError] = useState('');
  const [grantForm, setGrantForm] = useState(emptyPermissions);
  const [generatedAccessCode, setGeneratedAccessCode] = useState('');
  const [parentAccessCode, setParentAccessCode] = useState('');
  const [accessCodeMessage, setAccessCodeMessage] = useState('');
  const [playerPendingDelete, setPlayerPendingDelete] = useState(null);
  const [game, setGame] = useState({
    homeTeam: 'Tigers',
    awayTeam: 'Sharks',
    inning: 1,
    half: 'Top',
    balls: 0,
    strikes: 0,
    outs: 0,
    innings: emptyInnings,
    events: [
      'Game started',
      'Sharks batting, top of the 1st'
    ],
    players: loadSeasonPlayers(),
    schedule: loadSchedule(),
    livestreamUrl: ''
  });
  const [playerForm, setPlayerForm] = useState({ name: '', jerseyNumber: '' });
  const [playerError, setPlayerError] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState(() => loadSeasonPlayers()[0]?.id ?? '');
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '',
    opponent: '',
    location: ''
  });
  const [scheduleError, setScheduleError] = useState('');

  const connectedPlayer = useMemo(() => {
    return game.players.find(player => player.id === parentProfile?.playerId);
  }, [game.players, parentProfile]);
  const isCoach = parentProfile?.role === 'coach';
  const permissions = parentProfile?.permissions ?? emptyPermissions;
  const canEditScoring = isCoach || permissions.scoring;
  const canEditRoster = isCoach || permissions.roster;
  const canEditStats = isCoach || permissions.stats;
  const canEditLivestream = isCoach || permissions.livestream;

  useEffect(() => {
    localStorage.setItem('baseballSeasonPlayers', JSON.stringify(game.players));
  }, [game.players]);

  useEffect(() => {
    localStorage.setItem('baseballSeasonSchedule', JSON.stringify(game.schedule));
  }, [game.schedule]);

  useEffect(() => {
    if (parentProfile) {
      localStorage.setItem('baseballParentProfile', JSON.stringify(parentProfile));
    }
  }, [parentProfile]);

  useEffect(() => {
    localStorage.setItem('baseballTeamSettings', JSON.stringify(teamSettings));
  }, [teamSettings]);

  const upcomingGame = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return game.schedule.find(scheduledGame => scheduledGame.date >= today) ?? game.schedule[0];
  }, [game.schedule]);

  const totals = useMemo(() => {
    return game.innings.reduce(
      (acc, inn) => ({
        home: acc.home + inn.home,
        away: acc.away + inn.away
      }),
      { home: 0, away: 0 }
    );
  }, [game.innings]);

  function addEvent(text) {
    setGame(g => ({ ...g, events: [text, ...g.events] }));
  }

  function updateCount(type, amount, max) {
    setGame(g => ({
      ...g,
      [type]: Math.max(0, Math.min(max, g[type] + amount))
    }));
  }

  function addRun(team) {
    setGame(g => {
      const innings = [...g.innings];
      const index = g.inning - 1;
      innings[index] = {
        ...innings[index],
        [team]: innings[index][team] + 1
      };

      const teamName = team === 'home' ? g.homeTeam : g.awayTeam;
      return {
        ...g,
        innings,
        events: [`${teamName} scored 1 run`, ...g.events]
      };
    });
  }

  function removeRun(team) {
    setGame(g => {
      const innings = [...g.innings];
      const index = g.inning - 1;
      const currentRuns = innings[index][team];

      if (currentRuns === 0) {
        return {
          ...g,
          events: [`No ${team === 'home' ? g.homeTeam : g.awayTeam} runs to remove this inning`, ...g.events]
        };
      }

      innings[index] = {
        ...innings[index],
        [team]: currentRuns - 1
      };

      const teamName = team === 'home' ? g.homeTeam : g.awayTeam;
      return {
        ...g,
        innings,
        events: [`Removed 1 ${teamName} run`, ...g.events]
      };
    });
  }

  function nextHalfInning() {
    setGame(g => {
      let inning = g.inning;
      let half = g.half === 'Top' ? 'Bottom' : 'Top';
      if (g.half === 'Bottom') inning = Math.min(6, g.inning + 1);

      return {
        ...g,
        inning,
        half,
        balls: 0,
        strikes: 0,
        outs: 0,
        events: [`${half} of inning ${inning}`, ...g.events]
      };
    });
  }

  function resetGame() {
    setGame(g => ({
      ...g,
      inning: 1,
      half: 'Top',
      balls: 0,
      strikes: 0,
      outs: 0,
      innings: emptyInnings,
      events: ['Game reset']
    }));
  }

  function logPlay(label) {
    addEvent(`${game.half} ${game.inning}: ${label}`);
    setGame(g => ({ ...g, balls: 0, strikes: 0 }));
  }

  function addPlayer(event) {
    event.preventDefault();

    const name = playerForm.name.trim();
    const jerseyNumber = playerForm.jerseyNumber.trim();

    if (!name || !jerseyNumber) {
      setPlayerError('Add both a player name and jersey number.');
      return;
    }

    if (game.players.some(player => player.jerseyNumber === jerseyNumber)) {
      setPlayerError(`Jersey #${jerseyNumber} is already on the roster.`);
      return;
    }

    const player = {
      id: Date.now(),
      name,
      jerseyNumber,
      stats: { ...emptyStats }
    };

    setGame(g => ({
      ...g,
      players: [...g.players, player],
      events: [`Added #${jerseyNumber} ${name} to the roster`, ...g.events]
    }));
    setSelectedPlayerId(player.id);
    setPlayerForm({ name: '', jerseyNumber: '' });
    setPlayerError('');
  }

  function deletePlayer(playerId) {
    const player = game.players.find(currentPlayer => currentPlayer.id === playerId);
    if (!player) return;

    setGame(g => ({
      ...g,
      players: g.players.filter(currentPlayer => currentPlayer.id !== playerId),
      events: [`Removed #${player.jerseyNumber} ${player.name} from the roster`, ...g.events]
    }));

    if (selectedPlayerId === playerId) {
      const nextPlayer = game.players.find(currentPlayer => currentPlayer.id !== playerId);
      setSelectedPlayerId(nextPlayer?.id ?? '');
    }

    if (parentProfile?.playerId === playerId) {
      setParentProfile(profile => ({ ...profile, playerId: '' }));
    }

    setPlayerPendingDelete(null);
  }

  function updatePlayerStats(playerId, changes, eventLabel) {
    setGame(g => {
      const player = g.players.find(currentPlayer => currentPlayer.id === playerId);
      if (!player) return g;

      const players = g.players.map(currentPlayer => {
        if (currentPlayer.id !== playerId) return currentPlayer;

        const stats = { ...currentPlayer.stats };
        Object.entries(changes).forEach(([key, amount]) => {
          stats[key] = Math.max(0, stats[key] + amount);
        });

        return { ...currentPlayer, stats };
      });

      return {
        ...g,
        players,
        events: [`Season stats: #${player.jerseyNumber} ${player.name} - ${eventLabel}`, ...g.events]
      };
    });
  }

  function clearSeasonStats() {
    setGame(g => ({
      ...g,
      players: g.players.map(player => ({ ...player, stats: { ...emptyStats } })),
      events: ['Season stats reset', ...g.events]
    }));
  }

  function addScheduledGame(event) {
    event.preventDefault();

    const scheduledGame = {
      id: Date.now(),
      date: scheduleForm.date,
      time: scheduleForm.time.trim(),
      opponent: scheduleForm.opponent.trim(),
      location: scheduleForm.location.trim()
    };

    if (!scheduledGame.date || !scheduledGame.time || !scheduledGame.opponent || !scheduledGame.location) {
      setScheduleError('Add date, time, opponent, and location.');
      return;
    }

    setGame(g => ({
      ...g,
      schedule: [...g.schedule, scheduledGame].sort((a, b) => a.date.localeCompare(b.date)),
      events: [`Scheduled game vs ${scheduledGame.opponent} on ${scheduledGame.date}`, ...g.events]
    }));
    setScheduleForm({ date: '', time: '', opponent: '', location: '' });
    setScheduleError('');
  }

  function removeScheduledGame(gameId) {
    setGame(g => ({
      ...g,
      schedule: g.schedule.filter(scheduledGame => scheduledGame.id !== gameId),
      events: ['Removed a scheduled game', ...g.events]
    }));
  }

  function loginParent(event) {
    event.preventDefault();

    const name = loginForm.name.trim();
    const passcode = loginForm.passcode.trim();

    if (!name || !passcode) {
      setLoginError('Enter your name and team code.');
      return;
    }

    if (!teamSettings.teamCode || passcode.toLowerCase() !== teamSettings.teamCode.toLowerCase()) {
      setLoginError('That team code does not match.');
      return;
    }

    setParentProfile({ name, role: 'parent', playerId: '', permissions: { ...emptyPermissions } });
    setLoginForm({ name: '', passcode: '', teamName: teamSettings.teamName });
    setLoginError('');
  }

  function setupCoach(event) {
    event.preventDefault();

    const name = loginForm.name.trim();
    const teamName = loginForm.teamName.trim();
    const teamCode = loginForm.passcode.trim();

    if (!name || !teamName || !teamCode) {
      setLoginError('Enter coach name, team name, and team code.');
      return;
    }

    setTeamSettings({ teamName, teamCode });
    setParentProfile({ name, role: 'coach', playerId: '', permissions: { scoring: true, roster: true, stats: true, livestream: true } });
    setGame(g => ({ ...g, homeTeam: teamName, events: [`${teamName} team setup complete`, ...g.events] }));
    setLoginForm({ name: '', passcode: '', teamName });
    setLoginError('');
  }

  function logoutParent() {
    localStorage.removeItem('baseballParentProfile');
    setParentProfile(null);
    setActiveTab('home');
  }

  function connectPlayer(playerId) {
    const nextPlayerId = Number(playerId);
    const player = game.players.find(currentPlayer => currentPlayer.id === nextPlayerId);
    setParentProfile(profile => ({ ...profile, playerId: nextPlayerId }));
    if (player) addEvent(`${parentProfile.name} connected to #${player.jerseyNumber} ${player.name}`);
  }

  function generateParentAccessCode() {
    const hasPermission = Object.values(grantForm).some(Boolean);
    if (!hasPermission) {
      setGeneratedAccessCode('Choose at least one edit permission first.');
      return;
    }

    setGeneratedAccessCode(createAccessCode(teamSettings.teamCode, grantForm));
  }

  function applyParentAccessCode(event) {
    event.preventDefault();

    const accessGrant = readAccessCode(parentAccessCode);
    if (!accessGrant?.permissions || accessGrant.teamCode?.toLowerCase() !== teamSettings.teamCode.toLowerCase()) {
      setAccessCodeMessage('That access code is not valid for this team.');
      return;
    }

    setParentProfile(profile => ({
      ...profile,
      permissions: { ...emptyPermissions, ...accessGrant.permissions }
    }));
    setParentAccessCode('');
    setAccessCodeMessage('Edit access updated.');
  }

  if (!parentProfile) {
    return (
      <main className="app auth-app">
        <section className="hero auth-hero">
          <div>
            <p className="eyebrow">Parent Baseball Live</p>
            <h1>Team Access</h1>
            <p className="muted">Coaches create the team code. Parents use it to join.</p>
          </div>
        </section>

        <section className="auth-card panel">
          {authMode === 'choose' && (
            <>
              <h2>Choose Account Type</h2>
              <div className="auth-choice">
                <button onClick={() => setAuthMode('coach')}>Coach/Admin</button>
                <button className="secondary" onClick={() => setAuthMode('parent')}>Parent</button>
              </div>
            </>
          )}

          {authMode === 'coach' && (
            <>
              <h2>Coach Setup</h2>
              <form className="auth-form" onSubmit={setupCoach}>
                <label>
                  <span>Coach name</span>
                  <input
                    placeholder="Coach Evans"
                    value={loginForm.name}
                    onChange={e => {
                      setLoginForm({ ...loginForm, name: e.target.value });
                      setLoginError('');
                    }}
                  />
                </label>
                <label>
                  <span>Team name</span>
                  <input
                    placeholder="Tigers"
                    value={loginForm.teamName}
                    onChange={e => {
                      setLoginForm({ ...loginForm, teamName: e.target.value });
                      setLoginError('');
                    }}
                  />
                </label>
                <label>
                  <span>Create team code</span>
                  <input
                    placeholder="TIGERS2026"
                    value={loginForm.passcode}
                    onChange={e => {
                      setLoginForm({ ...loginForm, passcode: e.target.value });
                      setLoginError('');
                    }}
                  />
                </label>
                <button type="submit">Create Team</button>
              </form>
              <button className="link-button" onClick={() => setAuthMode('choose')}>Back</button>
            </>
          )}

          {authMode === 'parent' && (
            <>
              <h2>Parent Login</h2>
              <form className="auth-form" onSubmit={loginParent}>
                <label>
                  <span>Your name</span>
                  <input
                    placeholder="Cameron Evans"
                    value={loginForm.name}
                    onChange={e => {
                      setLoginForm({ ...loginForm, name: e.target.value });
                      setLoginError('');
                    }}
                  />
                </label>
                <label>
                  <span>Team code</span>
                  <input
                    placeholder="TIGERS2026"
                    value={loginForm.passcode}
                    onChange={e => {
                      setLoginForm({ ...loginForm, passcode: e.target.value });
                      setLoginError('');
                    }}
                  />
                </label>
                <button type="submit">Join Team</button>
              </form>
              <button className="link-button" onClick={() => setAuthMode('choose')}>Back</button>
            </>
          )}
          {loginError && <p className="form-error">{loginError}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="eyebrow">Parent Baseball Live</p>
          <h1>{game.awayTeam} vs {game.homeTeam}</h1>
          <p className="muted">Simple live scoring + livestream hub for families.</p>
          <p className="muted">Signed in as {parentProfile.name} ({isCoach ? 'Coach/Admin' : 'Parent'}){connectedPlayer ? `, connected to #${connectedPlayer.jerseyNumber} ${connectedPlayer.name}` : ''}</p>
        </div>
        <div className="hero-actions">
          {canEditScoring && (
            <button className="ghost" onClick={resetGame}>
              <RotateCcw size={18} /> Reset
            </button>
          )}
          <button className="ghost" onClick={logoutParent}>
            <LogOut size={18} /> Log Out
          </button>
        </div>
      </section>

      <nav className="tabs" aria-label="App sections">
        {[
          ['home', 'Home'],
          ['live', 'Live Game'],
          ['schedule', 'Schedule'],
          ['stats', 'Stats'],
          ['roster', 'Roster'],
          ['account', 'Account'],
          ['stream', 'Livestream'],
          ['feed', 'Feed']
        ].map(([id, label]) => (
          <button
            key={id}
            className={activeTab === id ? 'active' : ''}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'home' && (
        <section className="home-grid">
          <div className="panel home-panel">
            <h2>Game Center</h2>
            <p className="home-score">{game.awayTeam} {totals.away} - {totals.home} {game.homeTeam}</p>
            <p className="subtle">{game.half} of inning {game.inning}</p>
            <button onClick={() => setActiveTab('live')}>Open Live Game</button>
          </div>

          <div className="panel home-panel">
            <h2>Next Game</h2>
            {upcomingGame ? (
              <>
                <p className="home-score">vs {upcomingGame.opponent}</p>
                <p className="subtle">{upcomingGame.date} at {upcomingGame.time}</p>
                <p className="subtle">{upcomingGame.location}</p>
              </>
            ) : (
              <p className="subtle">No games scheduled yet.</p>
            )}
            <button onClick={() => setActiveTab('schedule')}>Open Schedule</button>
          </div>

          <div className="panel home-panel">
            <h2>Roster</h2>
            <p className="home-score">{game.players.length} players</p>
            <p className="subtle">Track jersey numbers and season stats.</p>
            <button onClick={() => setActiveTab('roster')}>Open Roster</button>
          </div>

          <div className="panel home-panel">
            <h2>My Player</h2>
            {connectedPlayer ? (
              <>
                <p className="home-score">#{connectedPlayer.jerseyNumber}</p>
                <p className="subtle">{connectedPlayer.name}</p>
              </>
            ) : (
              <>
                <p className="home-score">Not connected</p>
                <p className="subtle">Choose the player you follow.</p>
              </>
            )}
            <button onClick={() => setActiveTab('account')}>Open Account</button>
          </div>

          <div className="panel home-panel">
            <h2>Season Stats</h2>
            <p className="home-score">{game.players.reduce((sum, player) => sum + player.stats.hits, 0)} hits</p>
            <p className="subtle">Team total across saved player stats.</p>
            <button onClick={() => setActiveTab('stats')}>Open Stats</button>
          </div>
        </section>
      )}

      {activeTab === 'account' && (
        <section className="grid single-grid">
          <div className="panel account-panel">
            <h2>Parent Account</h2>
            <div className="account-summary">
              <div>
                <span>Signed in as</span>
                <strong>{parentProfile.name} ({isCoach ? 'Coach/Admin' : 'Parent'})</strong>
              </div>
              <div>
                <span>Team code</span>
                <strong>{isCoach ? teamSettings.teamCode : 'Ask your coach'}</strong>
              </div>
              <div>
                <span>Edit access</span>
                <strong>{isCoach ? 'Full coach access' : Object.entries(permissions).filter(([, enabled]) => enabled).map(([key]) => key).join(', ') || 'View only'}</strong>
              </div>
              <div>
                <span>Connected player</span>
                <strong>{connectedPlayer ? `#${connectedPlayer.jerseyNumber} ${connectedPlayer.name}` : 'None yet'}</strong>
              </div>
            </div>
            <label className="connect-player">
              <span>Connect to player</span>
              <select
                value={parentProfile.playerId}
                onChange={e => connectPlayer(e.target.value)}
              >
                <option value="">Choose a player</option>
                {game.players.map(player => (
                  <option key={player.id} value={player.id}>
                    #{player.jerseyNumber} {player.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary" onClick={logoutParent}>
              <LogOut size={16} /> Log Out
            </button>

            {isCoach ? (
              <div className="access-panel">
                <h3>Grant Parent Edit Access</h3>
                <div className="permission-grid">
                  {[
                    ['scoring', 'Scoring'],
                    ['roster', 'Roster'],
                    ['stats', 'Stats'],
                    ['livestream', 'Livestream']
                  ].map(([key, label]) => (
                    <label key={key} className="check-row">
                      <input
                        type="checkbox"
                        checked={grantForm[key]}
                        onChange={e => {
                          setGrantForm({ ...grantForm, [key]: e.target.checked });
                          setGeneratedAccessCode('');
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <button onClick={generateParentAccessCode}>Generate Access Code</button>
                {generatedAccessCode && (
                  <div className="access-code-box">
                    <span>Share this with the parent</span>
                    <strong>{generatedAccessCode}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div className="access-panel">
                <h3>Parent Editor Access</h3>
                <form className="access-form" onSubmit={applyParentAccessCode}>
                  <label>
                    <span>Access code from coach</span>
                    <input
                      placeholder="Paste access code"
                      value={parentAccessCode}
                      onChange={e => {
                        setParentAccessCode(e.target.value);
                        setAccessCodeMessage('');
                      }}
                    />
                  </label>
                  <button type="submit">Apply Access</button>
                </form>
                {accessCodeMessage && <p className="subtle">{accessCodeMessage}</p>}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'live' && (
        <>
          <section className="score-card">
        <div className="score">
          <span>{game.awayTeam}</span>
          <strong>{totals.away}</strong>
        </div>
        <div className="inning">
          <span>{game.half}</span>
          <strong>{game.inning}</strong>
        </div>
        <div className="score">
          <span>{game.homeTeam}</span>
          <strong>{totals.home}</strong>
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>Scoreboard</h2>
          <table>
            <thead>
              <tr>
                <th>Team</th>
                {game.innings.map((_, i) => <th key={i}>{i + 1}</th>)}
                <th>R</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{game.awayTeam}</td>
                {game.innings.map((inn, i) => <td key={i}>{inn.away}</td>)}
                <td><b>{totals.away}</b></td>
              </tr>
              <tr>
                <td>{game.homeTeam}</td>
                {game.innings.map((inn, i) => <td key={i}>{inn.home}</td>)}
                <td><b>{totals.home}</b></td>
              </tr>
            </tbody>
          </table>

          {canEditScoring && (
            <div className="button-row">
              <button onClick={() => addRun('away')}><Plus size={16} /> Away Run</button>
              <button className="secondary" onClick={() => removeRun('away')}><Minus size={16} /> Away Run</button>
              <button onClick={() => addRun('home')}><Plus size={16} /> Home Run</button>
              <button className="secondary" onClick={() => removeRun('home')}><Minus size={16} /> Home Run</button>
              <button onClick={nextHalfInning}>Next Half Inning</button>
            </div>
          )}
        </div>

        <div className="panel">
          <h2>Count</h2>
          <div className="count-grid">
            <Counter label="Balls" value={game.balls} canEdit={canEditScoring} onMinus={() => updateCount('balls', -1, 3)} onPlus={() => updateCount('balls', 1, 3)} />
            <Counter label="Strikes" value={game.strikes} canEdit={canEditScoring} onMinus={() => updateCount('strikes', -1, 2)} onPlus={() => updateCount('strikes', 1, 2)} />
            <Counter label="Outs" value={game.outs} canEdit={canEditScoring} onMinus={() => updateCount('outs', -1, 3)} onPlus={() => updateCount('outs', 1, 3)} />
          </div>

          {canEditScoring && (
            <>
              <h3>Quick Plays</h3>
              <div className="chips">
                {['Single', 'Double', 'Triple', 'Home Run', 'Walk', 'Strikeout', 'Groundout', 'Flyout', 'Stolen Base'].map(play => (
                  <button key={play} onClick={() => logPlay(play)}>{play}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
        </>
      )}

      {activeTab === 'roster' && (
        <section className="grid single-grid">
        <div className="panel roster">
          <h2><Shirt size={20} /> Team Roster</h2>
          {canEditRoster && (
            <>
              <form className="player-form" onSubmit={addPlayer}>
                <label>
                  <span>Player name</span>
                  <input
                    placeholder="e.g. Jordan Smith"
                    value={playerForm.name}
                    onChange={e => {
                      setPlayerForm({ ...playerForm, name: e.target.value });
                      setPlayerError('');
                    }}
                  />
                </label>
                <label>
                  <span>Jersey #</span>
                  <input
                    inputMode="numeric"
                    maxLength="3"
                    placeholder="24"
                    value={playerForm.jerseyNumber}
                    onChange={e => {
                      setPlayerForm({
                        ...playerForm,
                        jerseyNumber: e.target.value.replace(/\D/g, '')
                      });
                      setPlayerError('');
                    }}
                  />
                </label>
                <button type="submit"><Plus size={16} /> Add Player</button>
              </form>
              {playerError && <p className="form-error">{playerError}</p>}
            </>
          )}
          <div className="roster-list">
            {game.players.map(player => (
              <div className="player-row" key={player.id}>
                <span className="jersey-number">#{player.jerseyNumber}</span>
                <strong>{player.name}</strong>
                {canEditRoster && (
                  <div className="player-actions">
                    {playerPendingDelete === player.id ? (
                      <>
                        <button className="danger" onClick={() => deletePlayer(player.id)}>Confirm</button>
                        <button className="secondary" onClick={() => setPlayerPendingDelete(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="secondary" onClick={() => setPlayerPendingDelete(player.id)}>
                        <Minus size={16} /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        </section>
      )}

      {activeTab === 'stats' && (
        <section className="grid single-grid">
        <div className="panel season-stats">
          <h2>Season Stats</h2>
          {canEditStats && (
            <>
              <div className="stats-controls">
                <label>
                  <span>Player</span>
                  <select
                    value={selectedPlayerId}
                    onChange={e => setSelectedPlayerId(Number(e.target.value))}
                  >
                    {game.players.map(player => (
                      <option key={player.id} value={player.id}>
                        #{player.jerseyNumber} {player.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="secondary" onClick={clearSeasonStats}>Reset Stats</button>
              </div>

              <div className="stat-buttons">
                <button onClick={() => updatePlayerStats(selectedPlayerId, { atBats: 1 }, 'At bat')}>+ AB</button>
                <button onClick={() => updatePlayerStats(selectedPlayerId, { hits: 1, atBats: 1 }, 'Hit')}>+ Hit</button>
                <button onClick={() => updatePlayerStats(selectedPlayerId, { runs: 1 }, 'Run')}>+ Run</button>
                <button onClick={() => updatePlayerStats(selectedPlayerId, { rbis: 1 }, 'RBI')}>+ RBI</button>
                <button onClick={() => updatePlayerStats(selectedPlayerId, { walks: 1 }, 'Walk')}>+ Walk</button>
                <button onClick={() => updatePlayerStats(selectedPlayerId, { strikeouts: 1, atBats: 1 }, 'Strikeout')}>+ SO</button>
              </div>
            </>
          )}

          <div className="stats-table-wrap">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Player</th>
                  {Object.values(statLabels).map(label => <th key={label}>{label}</th>)}
                  <th>AVG</th>
                </tr>
              </thead>
              <tbody>
                {game.players.map(player => {
                  const average = player.stats.atBats ? player.stats.hits / player.stats.atBats : 0;
                  return (
                    <tr key={player.id}>
                      <td>#{player.jerseyNumber} {player.name}</td>
                      {Object.keys(statLabels).map(key => <td key={key}>{player.stats[key]}</td>)}
                      <td>{average.toFixed(3).replace(/^0/, '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </section>
      )}

      {activeTab === 'schedule' && (
        <section className="grid single-grid">
        <div className="panel schedule">
          <h2>Schedule</h2>
          {isCoach && (
            <>
              <form className="schedule-form" onSubmit={addScheduledGame}>
                <label>
                  <span>Date</span>
                  <input
                    type="date"
                    value={scheduleForm.date}
                    onChange={e => {
                      setScheduleForm({ ...scheduleForm, date: e.target.value });
                      setScheduleError('');
                    }}
                  />
                </label>
                <label>
                  <span>Time</span>
                  <input
                    placeholder="6:00 PM"
                    value={scheduleForm.time}
                    onChange={e => {
                      setScheduleForm({ ...scheduleForm, time: e.target.value });
                      setScheduleError('');
                    }}
                  />
                </label>
                <label>
                  <span>Opponent</span>
                  <input
                    placeholder="Rangers"
                    value={scheduleForm.opponent}
                    onChange={e => {
                      setScheduleForm({ ...scheduleForm, opponent: e.target.value });
                      setScheduleError('');
                    }}
                  />
                </label>
                <label>
                  <span>Location</span>
                  <input
                    placeholder="Field 1"
                    value={scheduleForm.location}
                    onChange={e => {
                      setScheduleForm({ ...scheduleForm, location: e.target.value });
                      setScheduleError('');
                    }}
                  />
                </label>
                <button type="submit"><Plus size={16} /> Add Game</button>
              </form>
              {scheduleError && <p className="form-error">{scheduleError}</p>}
            </>
          )}
          <div className="schedule-list">
            {game.schedule.map(scheduledGame => (
              <div className="schedule-row" key={scheduledGame.id}>
                <div className="schedule-date">
                  <strong>{new Date(`${scheduledGame.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong>
                  <span>{scheduledGame.time}</span>
                </div>
                <div>
                  <strong>vs {scheduledGame.opponent}</strong>
                  <span>{scheduledGame.location}</span>
                </div>
                {isCoach && (
                  <button className="icon-button" aria-label={`Remove game vs ${scheduledGame.opponent}`} onClick={() => removeScheduledGame(scheduledGame.id)}>
                    <Minus size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        </section>
      )}

      {activeTab === 'stream' && (
        <section className="grid single-grid">
        <div className="panel livestream">
          <h2><Radio size={20} /> Livestream</h2>
          {canEditLivestream && (
            <input
              placeholder="Paste YouTube/Facebook livestream embed URL later"
              value={game.livestreamUrl}
              onChange={e => setGame({ ...game, livestreamUrl: e.target.value })}
            />
          )}
          {game.livestreamUrl ? (
            <iframe title="Livestream" src={game.livestreamUrl} allowFullScreen />
          ) : (
            <div className="stream-placeholder">
              <Play size={42} />
              <p>Livestream placeholder</p>
              <span>Phase 1 uses scoring. Phase 2 adds live video.</span>
            </div>
          )}
        </div>
        </section>
      )}

      {activeTab === 'feed' && (
        <section className="grid single-grid">
        <div className="panel feed">
          <h2>Family Feed</h2>
          <div className="manual-event">
            <button onClick={() => addEvent('Big play! Family update posted.')}>Add Family Update</button>
          </div>
          {game.events.map((event, i) => (
            <div className="event" key={i}>{event}</div>
          ))}
        </div>
      </section>
      )}
    </main>
  );
}

function Counter({ label, value, canEdit, onMinus, onPlus }) {
  return (
    <div className="counter">
      <span>{label}</span>
      <strong>{value}</strong>
      {canEdit && (
        <div>
          <button onClick={onMinus}><Minus size={14} /></button>
          <button onClick={onPlus}><Plus size={14} /></button>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
