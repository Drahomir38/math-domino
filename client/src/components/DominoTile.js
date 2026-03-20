import React from 'react';
import './DominoTile.css';

/**
 * A single domino tile.
 * Props:
 *  - tile: { id, left: {expr, value}, right: {expr, value} }
 *  - flipped: bool (swap left/right visually)
 *  - selected: bool
 *  - onClick: fn
 *  - small: bool (for board tiles)
 *  - disabled: bool
 */
export default function DominoTile({ tile, flipped, selected, onClick, small, disabled, highlight }) {
  const left = flipped ? tile.right : tile.left;
  const right = flipped ? tile.left : tile.right;

  const cls = [
    'domino-tile',
    small ? 'domino-small' : '',
    selected ? 'domino-selected' : '',
    disabled ? 'domino-disabled' : '',
    highlight ? 'domino-highlight' : '',
    onClick && !disabled ? 'domino-clickable' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} onClick={!disabled && onClick ? onClick : undefined} title={`${left.expr} | ${right.expr}`}>
      <div className="domino-half domino-left">
        <span>{left.expr}</span>
      </div>
      <div className="domino-divider" />
      <div className="domino-half domino-right">
        <span>{right.expr}</span>
      </div>
    </div>
  );
}
