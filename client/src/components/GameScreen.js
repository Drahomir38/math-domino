import React, { useState, useRef } from 'react';
import DominoTile from './DominoTile';
import './GameScreen.css';

const PLAYER_COLORS = ['#ff6b9d', '#6bcbff', '#ffd93d'];

export default function GameScreen({ hand, publicState, players, playerId, isMyTurn, onPlaceTile, onPassTurn }) {
  const [selectedTile, setSelectedTile] = useState(null);
  const [selectedFlipped, setSelectedFlipped] = useState(false);
  const boardRef = useRef(null);

  const { chain, leftEnd, rightEnd, currentPlayerId, handCounts, tilesPlaced } = publicState;
  const currentPlayerObj = players.find(p => p.id === currentPlayerId);

  // Check if selected tile can be placed on a given end — for button visibility only, NO tile highlighting
  const canPlaceOnEnd = (tile, end) => {
    if (!tile) return false;
    const endVal = end === 'left' ? leftEnd : rightEnd;
    return tile.left.value === endVal || tile.right.value === endVal;
  };

  const handleTileClick = (tile) => {
    if (!isMyTurn) return;
    if (selectedTile?.tile.id === tile.id) {
      // Second click on same tile = flip it
      setSelectedFlipped(f => !f);
    } else {
      setSelectedTile({ tile });
      setSelectedFlipped(false);
    }
  };

  const handlePlaceOnEnd = (end) => {
    if (!selectedTile || !isMyTurn) return;
    const tile = selectedTile.tile;
    const endVal = end === 'left' ? leftEnd : rightEnd;

    let flipped = false;
    if (tile.left.value === endVal) flipped = false;
    else if (tile.right.value === endVal) flipped = true;
    else return;

    onPlaceTile(tile.id, end, flipped);
    setSelectedTile(null);
    setSelectedFlipped(false);
  };

  return (
    <div className="game-screen">
      {/* Top bar: players */}
      <div className="game-topbar">
        {players.map((p, i) => {
          const isCurrent = p.id === currentPlayerId;
          const isMe = p.id === playerId;
          return (
            <div
              key={p.id}
              className={`player-status ${isCurrent ? 'active' : ''}`}
              style={{ '--color': PLAYER_COLORS[i] }}
            >
              {isCurrent && <span className="turn-arrow">▶</span>}
              <div className="ps-info">
                <span className="ps-name">{isMe ? `${p.name} (ty)` : p.name}</span>
                <span className="ps-stats">
                  🎴 {handCounts[p.id]} v ruce &nbsp;·&nbsp; ✅ {tilesPlaced?.[p.id] ?? 0} položeno
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Turn indicator */}
      <div className={`turn-banner ${isMyTurn ? 'my-turn' : 'other-turn'}`}>
        {isMyTurn ? '🎉 Jsi na tahu!' : `⏳ Hraje ${currentPlayerObj?.name || '...'}`}
      </div>

      {/* Board */}
      <div className="board-container" ref={boardRef}>
        {isMyTurn && selectedTile && canPlaceOnEnd(selectedTile.tile, 'left') && (
          <button className="place-end-btn place-left" onClick={() => handlePlaceOnEnd('left')}>← Sem</button>
        )}

        <div className="board-scroll">
          <div className="board-chain">
            <div className="end-indicator">
              <span className="end-val">{leftEnd}</span>
            </div>
            {chain.map((tile, i) => (
              <DominoTile key={`${tile.id}-${i}`} tile={tile} flipped={tile.flipped} small />
            ))}
            <div className="end-indicator">
              <span className="end-val">{rightEnd}</span>
            </div>
          </div>
        </div>

        {isMyTurn && selectedTile && canPlaceOnEnd(selectedTile.tile, 'right') && (
          <button className="place-end-btn place-right" onClick={() => handlePlaceOnEnd('right')}>Sem →</button>
        )}
      </div>

      {/* Hand */}
      <div className="hand-area">
        <div className="hand-header">
          <span>Tvoje kostičky ({hand.length})</span>
          {selectedTile && (
            <span className="hint-text">
              {canPlaceOnEnd(selectedTile.tile, 'left') || canPlaceOnEnd(selectedTile.tile, 'right')
                ? '✅ Klikni na šipku kde chceš umístit'
                : '❌ Tato kostička se tam nehodí'}
            </span>
          )}
        </div>

        <div className="hand-tiles">
          {hand.map((tile) => (
            <DominoTile
              key={tile.id}
              tile={tile}
              flipped={selectedTile?.tile.id === tile.id ? selectedFlipped : false}
              selected={selectedTile?.tile.id === tile.id}
              onClick={() => handleTileClick(tile)}
              disabled={!isMyTurn}
            />
          ))}
        </div>

        {isMyTurn && (
          <div className="action-buttons">
            {selectedTile && (
              <button className="btn-flip" onClick={() => setSelectedFlipped(f => !f)}>
                🔄 Otočit kostičku
              </button>
            )}
            <button className="btn-pass" onClick={onPassTurn}>
              ⏩ Přeskočit tah
            </button>
          </div>
        )}
      </div>

      {isMyTurn && !selectedTile && (
        <div className="instruction-tip">
          💡 Vyber kostičku — vypočítej si příklady a zjisti kam pasuje
        </div>
      )}
    </div>
  );
}
