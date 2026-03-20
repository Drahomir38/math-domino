import React from 'react';
import './GameOverScreen.css';

const PLAYER_COLORS = ['#ff6b9d', '#6bcbff', '#ffd93d'];

export default function GameOverScreen({ data, players, playerId, isHost, onRestart }) {
  if (!data) return null;

  const { winnerId, winnerName, tilesPlaced } = data;
  const iWon = winnerId === playerId;

  // Sort players by tiles placed descending for scoreboard
  const sorted = [...players].sort((a, b) =>
    (tilesPlaced?.[b.id] ?? 0) - (tilesPlaced?.[a.id] ?? 0)
  );

  const medals = ['🥇', '🥈', '🥉'];

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
        <p className="gameover-rule">Vyhrává ten, kdo položil nejvíce kostiček.</p>

        <div className="gameover-players">
          {sorted.map((p, rank) => {
            const origIdx = players.findIndex(pl => pl.id === p.id);
            return (
              <div
                key={p.id}
                className={`go-player ${p.id === winnerId ? 'winner' : ''}`}
                style={{ borderColor: PLAYER_COLORS[origIdx] }}
              >
                <span className="go-medal">{medals[rank] || '·'}</span>
                <span className="go-name">{p.name}</span>
                <span className="go-score">{tilesPlaced?.[p.id] ?? 0} kostiček</span>
                {p.id === playerId && <span className="you-tag">ty</span>}
              </div>
            );
          })}
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
