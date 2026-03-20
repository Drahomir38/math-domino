import React from 'react';
import './GameOverScreen.css';

const PLAYER_COLORS = ['#ff6b9d', '#6bcbff', '#ffd93d'];

export default function GameOverScreen({ data, players, playerId, isHost, onRestart }) {
  if (!data) return null;

  const { winnerId, winnerName } = data;
  const iWon = winnerId === playerId;

  return (
    <div className="gameover-screen">
      <div className="gameover-card">
        <div className="gameover-emoji">{iWon ? '🏆' : '🎮'}</div>
        <h1 className="gameover-title">
          {iWon ? 'Výborně!' : 'Konec hry!'}
        </h1>
        <p className="gameover-winner">
          {iWon ? 'Ty jsi vyhrál/a! 🎉' : `Vyhrál/a ${winnerName}! 🎉`}
        </p>

        <div className="gameover-players">
          {players.map((p, i) => (
            <div
              key={p.id}
              className={`go-player ${p.id === winnerId ? 'winner' : ''}`}
              style={{ borderColor: PLAYER_COLORS[i] }}
            >
              <span style={{ color: PLAYER_COLORS[i] }}>{p.id === winnerId ? '🥇' : '🥈'}</span>
              <span>{p.name}</span>
              {p.id === playerId && <span className="you-tag">ty</span>}
            </div>
          ))}
        </div>

        {isHost ? (
          <button className="btn-restart" onClick={onRestart}>
            🔄 Hrát znovu
          </button>
        ) : (
          <p className="waiting-restart">⏳ Čekáme až hostitel spustí novou hru...</p>
        )}
      </div>
    </div>
  );
}
