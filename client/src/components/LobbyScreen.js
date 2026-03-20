import React, { useState } from 'react';
import './LobbyScreen.css';

const PLAYER_COLORS = ['#ff6b9d', '#6bcbff', '#ffd93d'];

export default function LobbyScreen({ players, isHost, settings, error, onJoin, onUpdateSettings, onStartGame, playerId }) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name.trim() || !room.trim()) return;
    onJoin(name.trim(), room.trim().toUpperCase());
    setJoined(true);
  };

  const toggleOp = (op) => {
    const ops = settings.operations.includes(op)
      ? settings.operations.filter(o => o !== op)
      : [...settings.operations, op];
    if (ops.length === 0) return;
    onUpdateSettings({ ...settings, operations: ops });
  };

  const ops = [
    { key: '+', label: '+ sčítání' },
    { key: '-', label: '− odčítání' },
    { key: '*', label: '× násobení' },
    { key: '/', label: '÷ dělení' },
  ];

  return (
    <div className="lobby-screen">
      <div className="lobby-header">
        <div className="lobby-logo">🎲</div>
        <h1>Math Match<br/>Domino</h1>
        <p className="lobby-subtitle">Matematická hra pro 2–3 hráče</p>
      </div>

      {!joined ? (
        <div className="lobby-card">
          <h2>Připojit se ke hře</h2>
          <form onSubmit={handleJoin} className="join-form">
            <div className="form-group">
              <label>Tvoje jméno</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Napiš své jméno..."
                maxLength={20}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Kód místnosti</label>
              <input
                type="text"
                value={room}
                onChange={e => setRoom(e.target.value.toUpperCase())}
                placeholder="např. SKOLA1"
                maxLength={10}
              />
              <small>Stejný kód zadají všichni hráči</small>
            </div>
            {error && <div className="error-msg">⚠️ {error}</div>}
            <button type="submit" className="btn-primary btn-large">
              Vstoupit do místnosti →
            </button>
          </form>
        </div>
      ) : (
        <div className="lobby-joined">
          <div className="lobby-card">
            <h2>Místnost: <span className="room-code">{room}</span></h2>

            <div className="players-list">
              <h3>Hráči ({players.length}/3)</h3>
              {players.map((p, i) => (
                <div key={p.id} className="player-chip" style={{ borderColor: PLAYER_COLORS[i] }}>
                  <span className="player-dot" style={{ background: PLAYER_COLORS[i] }}/>
                  {p.name}
                  {i === 0 && <span className="host-badge">👑 hostitel</span>}
                  {p.id === playerId && <span className="you-badge">ty</span>}
                </div>
              ))}
              {players.length < 3 && (
                <div className="waiting-chip">
                  <span className="blink">⏳</span> Čeká se na dalšího hráče...
                </div>
              )}
            </div>

            {isHost && (
              <div className="settings-panel">
                <h3>⚙️ Znaménka v příkladech</h3>
                <p className="settings-note">Každá kostička má na obou stranách příklad. Musíš spočítat výsledky a najít kam kostička pasuje.</p>
                <div className="op-buttons">
                  {ops.map(op => (
                    <button
                      key={op.key}
                      className={`op-btn ${settings.operations.includes(op.key) ? 'active' : ''}`}
                      onClick={() => toggleOp(op.key)}
                      type="button"
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isHost && (
              <div className="settings-view">
                <h3>⚙️ Nastavení hry</h3>
                <p>Znaménka: <strong>{settings.operations.join(', ')}</strong></p>
              </div>
            )}

            {isHost ? (
              <button
                className="btn-primary btn-large btn-start"
                onClick={onStartGame}
                disabled={players.length < 2}
              >
                {players.length < 2 ? 'Čeká se na hráče...' : '▶ Spustit hru!'}
              </button>
            ) : (
              <div className="waiting-msg">
                <span className="blink">⏳</span> Čekáme až hostitel spustí hru...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
