import React, { useState, useRef, useCallback } from 'react';
import DominoTile from './DominoTile';
import './GameScreen.css';

const PLAYER_COLORS = ['#ff6b9d', '#6bcbff', '#ffd93d'];

export default function GameScreen({ hand, publicState, players, playerId, isMyTurn, onPlaceTile, onDrawTile }) {
  const [selectedTile, setSelectedTile] = useState(null); // { tile, handIndex }
  const [selectedFlipped, setSelectedFlipped] = useState(false);
  const boardRef = useRef(null);

  const { chain, leftEnd, rightEnd, currentPlayerId, drawPileCount, handCounts } = publicState;

  const currentPlayerObj = players.find(p => p.id === currentPlayerId);

  const canPlaceOnEnd = useCallback((tile, end) => {
    if (!tile) return false;
    const endVal = end === 'left' ? leftEnd : rightEnd;
    return tile.left.value === endVal || tile.right.value === endVal;
  }, [leftEnd, rightEnd]);

  const handleTileClick = (tile) => {
    if (!isMyTurn) return;
    if (selectedTile?.tile.id === tile.id) {
      // Toggle flip
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

    // Determine if we need to flip
    let flipped = false;
    if (tile.left.value === endVal) {
      flipped = false;
    } else if (tile.right.value === endVal) {
      flipped = true;
    } else {
      return; // can't place
    }

    onPlaceTile(tile.id, end, flipped);
    setSelectedTile(null);
    setSelectedFlipped(false);
  };

  const handleDraw = () => {
    if (!isMyTurn) return;
    onDrawTile();
  };

  const playerColor = (pid) => {
    const idx = players.findIndex(p => p.id === pid);
    return PLAYER_COLORS[idx] || '#ccc';
  };

  return (
    <div className="game-screen">
      {/* Top bar: players status */}
      <div className="game-topbar">
        {players.map((p) => {
          const isCurrent = p.id === currentPlayerId;
          const isMe = p.id === playerId;
          return (
            <div
              key={p.id}
              className={`player-status ${isCurrent ? 'active' : ''}`}
              style={{ '--color': playerColor(p.id) }}
            >
              {isCurrent && <span className="turn-arrow">▶</span>}
              <span className="ps-name">{isMe ? `${p.name} (ty)` : p.name}</span>
              <span className="ps-tiles">🀱 {handCounts[p.id]}</span>
            </div>
          );
        })}
        <div className="pile-count">
          <span>Balíček</span>
          <span className="pile-num">{drawPileCount}</span>
        </div>
      </div>

      {/* Turn indicator */}
      <div className={`turn-banner ${isMyTurn ? 'my-turn' : 'other-turn'}`}>
        {isMyTurn
          ? '🎉 Jsi na tahu!'
          : `⏳ Hraje ${currentPlayerObj?.name || '...'}`}
      </div>

      {/* Board / chain area */}
      <div className="board-container" ref={boardRef}>
        {/* Left placement button */}
        {isMyTurn && selectedTile && canPlaceOnEnd(selectedTile.tile, 'left') && (
          <button className="place-end-btn place-left" onClick={() => handlePlaceOnEnd('left')}>
            ← Sem
          </button>
        )}

        <div className="board-scroll">
          <div className="board-chain">
            {/* Left end indicator */}
            <div className="end-indicator left-end">
              <span className="end-val">{leftEnd}</span>
            </div>

            {chain.map((tile, i) => (
              <DominoTile
                key={`${tile.id}-${i}`}
                tile={tile}
                flipped={tile.flipped}
                small={true}
              />
            ))}

            {/* Right end indicator */}
            <div className="end-indicator right-end">
              <span className="end-val">{rightEnd}</span>
            </div>
          </div>
        </div>

        {/* Right placement button */}
        {isMyTurn && selectedTile && canPlaceOnEnd(selectedTile.tile, 'right') && (
          <button className="place-end-btn place-right" onClick={() => handlePlaceOnEnd('right')}>
            Sem →
          </button>
        )}
      </div>

      {/* Hand */}
      <div className="hand-area">
        <div className="hand-header">
          <span>Tvoje kostičky ({hand.length})</span>
          {selectedTile && (
            <span className="hint-text">
              {canPlaceOnEnd(selectedTile.tile, 'left') || canPlaceOnEnd(selectedTile.tile, 'right')
                ? '✅ Kliklni na šipku kde chceš umístit'
                : '❌ Tato kostička se tam nehodí'}
            </span>
          )}
        </div>
        <div className="hand-tiles">
          {hand.map((tile) => {
            const isSelected = selectedTile?.tile.id === tile.id;
            const canPlay = isMyTurn && (canPlaceOnEnd(tile, 'left') || canPlaceOnEnd(tile, 'right'));
            return (
              <DominoTile
                key={tile.id}
                tile={tile}
                flipped={isSelected ? selectedFlipped : false}
                selected={isSelected}
                highlight={canPlay && !isSelected}
                onClick={() => handleTileClick(tile)}
                disabled={!isMyTurn}
              />
            );
          })}
        </div>

        {isMyTurn && (
          <div className="action-buttons">
            {selectedTile && (
              <button
                className="btn-flip"
                onClick={() => setSelectedFlipped(f => !f)}
              >
                🔄 Otočit
              </button>
            )}
            <button
              className="btn-draw"
              onClick={handleDraw}
              disabled={!isMyTurn}
            >
              📥 Vzít z balíčku ({drawPileCount})
            </button>
          </div>
        )}
      </div>

      {/* Instructions tooltip */}
      {isMyTurn && !selectedTile && hand.length > 0 && (
        <div className="instruction-tip">
          💡 Vyber kostičku ze své ruky a pak klikni kde ji chceš přidat
        </div>
      )}
    </div>
  );
}
