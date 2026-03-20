// =============================================
// MATH DOMINO - Game Logic
// =============================================

/**
 * Generate math domino tiles — BOTH sides are always equations.
 * Matching rule: the result of the touching equation must be equal.
 * e.g. tile A right "3+4=7" touches tile B left "2+5=7" → match!
 * Players must calculate themselves — no hints in UI.
 */
function generateTiles(operations) {
  const ops = operations && operations.length > 0 ? operations : ['+'];

  // Build pool of unique expressions grouped by result value
  const byResult = {};
  for (let a = 0; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      for (const op of ops) {
        let result;
        if (op === '+') result = a + b;
        else if (op === '-') result = a - b;
        else if (op === '*') result = a * b;
        else if (op === '/') {
          if (b === 0 || a % b !== 0) continue;
          result = a / b;
        }
        if (result === undefined || result < 0 || result > 81) continue;
        const expr = `${a}${opSymbol(op)}${b}`;
        if (!byResult[result]) byResult[result] = [];
        if (!byResult[result].find(e => e.expr === expr)) {
          byResult[result].push({ expr, value: result });
        }
      }
    }
  }

  const tiles = [];
  let id = 0;

  // Same-result pairs: both sides have equations with equal answers
  for (const val of Object.keys(byResult)) {
    const group = shuffle([...byResult[val]]);
    for (let i = 0; i + 1 < group.length; i += 2) {
      tiles.push({ id: id++, left: group[i], right: group[i + 1] });
    }
  }

  // Cross-value tiles: left.value !== right.value (adds variety and replayability)
  const vals = Object.keys(byResult).map(Number);
  for (let i = 0; i < vals.length - 1; i += 2) {
    const lPool = byResult[vals[i]];
    const rPool = byResult[vals[i + 1]];
    if (lPool.length && rPool.length) {
      tiles.push({
        id: id++,
        left: lPool[Math.floor(Math.random() * lPool.length)],
        right: rPool[Math.floor(Math.random() * rPool.length)],
      });
    }
  }

  return shuffle(tiles);
}

function opSymbol(op) {
  if (op === '*') return '×';
  if (op === '/') return '÷';
  return op;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Create a new game state
 */
function createGame(roomId, players, settings) {
  const allTiles = generateTiles(settings.operations);

  // Deal 10 tiles to each player
  const hands = {};
  let idx = 0;
  for (const p of players) {
    hands[p.id] = allTiles.slice(idx, idx + 10);
    idx += 10;
  }

  // Starting tile placed on the table (random, not from any hand)
  const startTile = allTiles[idx] || allTiles[0];
  const chain = [{ ...startTile, flipped: false }];

  // Tiles placed counter per player
  const tilesPlaced = {};
  for (const p of players) tilesPlaced[p.id] = 0;

  return {
    roomId,
    players,
    hands,
    chain,
    leftEnd: startTile.left.value,
    rightEnd: startTile.right.value,
    currentPlayerIndex: 0,
    phase: 'playing',
    winner: null,
    settings,
    tilesPlaced,
    consecutivePasses: 0,
  };
}

/**
 * Place a tile. Returns { success, state, message }
 */
function placeTile(state, playerId, tileId, end, flipped) {
  if (state.phase !== 'playing') return { success: false, message: 'Hra již skončila.' };
  const cur = state.players[state.currentPlayerIndex];
  if (cur.id !== playerId) return { success: false, message: 'Nejsi na tahu.' };

  const hand = state.hands[playerId];
  const tileIdx = hand.findIndex(t => t.id === tileId);
  if (tileIdx === -1) return { success: false, message: 'Kostičku nemáš v ruce.' };

  const tile = hand[tileIdx];
  const boardEnd = end === 'left' ? state.leftEnd : state.rightEnd;

  // The touching side must equal boardEnd
  const touchingVal = flipped ? tile.right.value : tile.left.value;
  const newEndVal   = flipped ? tile.left.value  : tile.right.value;

  if (touchingVal !== boardEnd) {
    return { success: false, message: `Výsledek musí být ${boardEnd}.` };
  }

  const newHand = hand.filter((_, i) => i !== tileIdx);
  const newChain = [...state.chain];
  if (end === 'left') newChain.unshift({ ...tile, flipped });
  else newChain.push({ ...tile, flipped });

  const newHands = { ...state.hands, [playerId]: newHand };
  const newTilesPlaced = { ...state.tilesPlaced, [playerId]: state.tilesPlaced[playerId] + 1 };

  const allEmpty = Object.values(newHands).every(h => h.length === 0);
  const nextIdx = (state.currentPlayerIndex + 1) % state.players.length;

  let phase = state.phase;
  let winner = state.winner;
  if (allEmpty) {
    phase = 'finished';
    winner = getMostTilesPlayer(state.players, newTilesPlaced);
  }

  return {
    success: true,
    state: {
      ...state,
      hands: newHands,
      chain: newChain,
      leftEnd: end === 'left' ? newEndVal : state.leftEnd,
      rightEnd: end === 'right' ? newEndVal : state.rightEnd,
      currentPlayerIndex: nextIdx,
      phase,
      winner,
      tilesPlaced: newTilesPlaced,
      consecutivePasses: 0,
    },
  };
}

/**
 * Pass turn — used when player has no valid move.
 * When all players pass consecutively → game ends.
 */
function passTurn(state, playerId) {
  if (state.phase !== 'playing') return { success: false, message: 'Hra již skončila.' };
  const cur = state.players[state.currentPlayerIndex];
  if (cur.id !== playerId) return { success: false, message: 'Nejsi na tahu.' };

  const newPasses = state.consecutivePasses + 1;
  const nextIdx = (state.currentPlayerIndex + 1) % state.players.length;

  if (newPasses >= state.players.length) {
    return {
      success: true,
      state: {
        ...state,
        phase: 'finished',
        winner: getMostTilesPlayer(state.players, state.tilesPlaced),
        consecutivePasses: newPasses,
        currentPlayerIndex: nextIdx,
      },
    };
  }

  return {
    success: true,
    state: { ...state, consecutivePasses: newPasses, currentPlayerIndex: nextIdx },
  };
}

function getMostTilesPlayer(players, tilesPlaced) {
  return players.reduce((best, p) =>
    tilesPlaced[p.id] > tilesPlaced[best] ? p.id : best,
    players[0].id
  );
}

function hasValidMove(state, playerId) {
  const hand = state.hands[playerId];
  for (const tile of hand) {
    if (
      tile.left.value === state.leftEnd || tile.right.value === state.leftEnd ||
      tile.left.value === state.rightEnd || tile.right.value === state.rightEnd
    ) return true;
  }
  return false;
}

module.exports = { generateTiles, createGame, placeTile, passTurn, hasValidMove };
