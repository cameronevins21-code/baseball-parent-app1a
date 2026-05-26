import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Play, Radio, Plus, Minus, RotateCcw, Shirt } from 'lucide-react';
import './styles.css';

const emptyInnings = Array.from({ length: 6 }, () => ({ home: 0, away: 0 }));

function App() {
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
    players: [
      { id: 1, name: 'Avery Johnson', jerseyNumber: '7' },
      { id: 2, name: 'Mason Lee', jerseyNumber: '12' }
    ],
    livestreamUrl: ''
  });
  const [playerForm, setPlayerForm] = useState({ name: '', jerseyNumber: '' });
  const [playerError, setPlayerError] = useState('');

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
      jerseyNumber
    };

    setGame(g => ({
      ...g,
      players: [...g.players, player],
      events: [`Added #${jerseyNumber} ${name} to the roster`, ...g.events]
    }));
    setPlayerForm({ name: '', jerseyNumber: '' });
    setPlayerError('');
  }

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="eyebrow">Parent Baseball Live</p>
          <h1>{game.awayTeam} vs {game.homeTeam}</h1>
          <p className="muted">Simple live scoring + livestream hub for families.</p>
        </div>
        <button className="ghost" onClick={resetGame}>
          <RotateCcw size={18} /> Reset
        </button>
      </section>

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

          <div className="button-row">
            <button onClick={() => addRun('away')}><Plus size={16} /> Away Run</button>
            <button onClick={() => addRun('home')}><Plus size={16} /> Home Run</button>
            <button onClick={nextHalfInning}>Next Half Inning</button>
          </div>
        </div>

        <div className="panel">
          <h2>Count</h2>
          <div className="count-grid">
            <Counter label="Balls" value={game.balls} onMinus={() => updateCount('balls', -1, 3)} onPlus={() => updateCount('balls', 1, 3)} />
            <Counter label="Strikes" value={game.strikes} onMinus={() => updateCount('strikes', -1, 2)} onPlus={() => updateCount('strikes', 1, 2)} />
            <Counter label="Outs" value={game.outs} onMinus={() => updateCount('outs', -1, 3)} onPlus={() => updateCount('outs', 1, 3)} />
          </div>

          <h3>Quick Plays</h3>
          <div className="chips">
            {['Single', 'Double', 'Triple', 'Home Run', 'Walk', 'Strikeout', 'Groundout', 'Flyout', 'Stolen Base'].map(play => (
              <button key={play} onClick={() => logPlay(play)}>{play}</button>
            ))}
          </div>
        </div>

        <div className="panel roster">
          <h2><Shirt size={20} /> Team Roster</h2>
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
          <div className="roster-list">
            {game.players.map(player => (
              <div className="player-row" key={player.id}>
                <span className="jersey-number">#{player.jerseyNumber}</span>
                <strong>{player.name}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel livestream">
          <h2><Radio size={20} /> Livestream</h2>
          <input
            placeholder="Paste YouTube/Facebook livestream embed URL later"
            value={game.livestreamUrl}
            onChange={e => setGame({ ...game, livestreamUrl: e.target.value })}
          />
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
    </main>
  );
}

function Counter({ label, value, onMinus, onPlus }) {
  return (
    <div className="counter">
      <span>{label}</span>
      <strong>{value}</strong>
      <div>
        <button onClick={onMinus}><Minus size={14} /></button>
        <button onClick={onPlus}><Plus size={14} /></button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
