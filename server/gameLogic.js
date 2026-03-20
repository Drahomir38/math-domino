// =============================================
// MATH DOMINO - Game Logic
// =============================================

/**
 * Generate all math domino tiles based on settings.
 * Each tile: { id, left: {expr, value}, right: {expr, value} }
 *
 * Modes:
 *  - "easy":   one side = equation, other side = plain number (answer)
 *  - "hard":   both sides = equations (matched by equal results)
 */
function generateTiles(operations, mode) {
  const ops = operations && operations.length > 0 ? operations : ['+'];
  const results = new Set();
  const expressions = [];

  // Build a pool of expressions for each result 0-18
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
        expressions.push({ expr: `${a}${opSymbol(op)}${b}`, value: result });
        results.add(result);
      }
    }
  }

  const tiles = [];
  let id = 0;

  if (mode === 'easy') {
    // left = equation, right = number (answer)
    // Pick unique equations (remove duplicates by expr)
    const unique = dedup(expressions);
    // Shuffle and take up to 56 tiles
    const shuffled = shuffle([...unique]);
    const pool = shuffled.slice(0, 56);
    for (const exprObj of pool) {
      tiles.push({
        id: id++,
        left: exprObj,
        right: { expr: String(exprObj.value), value: exprObj.value },
      });
    }
  } else {
    // hard: both sides = equations with equal results
    // Group by result value
    const byResult = {};
    const unique = dedup(expressions);
    for (const e of unique) {
      if (!byResult[e.value]) byResult[e.value] = [];
      byResult[e.value].push(e);
    }
    // Create pairs within same result group
    for (const val of Object.keys(byResult)) {
      const group = shuffle([...byResult[val]]);
      for (let i = 0; i + 1 < group.length; i += 2) {
        tiles.push({
          id: id++,
          left: group[i],
          right: group[i + 1],
        });
        if (tiles.length >= 60) break;
      }
      if (tiles.length >= 60) break;
    }
  }

  return shuffle(tiles);
}

function opSymbol(op) {
  if (op === '*') return '×';
  if (op === '/') return '÷';
  return op;
}

function dedup(arr) {
  const seen = new Set();
  return arr.filter(e => {
    if (seen.has(e.expr)) return false;
    seen.add(e.expr);
    return true;
  });
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
 * Check if a tile can be placed at a given end of the chain.
 * end: 'left' | 'right'  (which end of the board chain we're attaching to)
 * boardEndValue: the value exposed at that end
 * tile: the tile being placed
 * flipped: whether the tile is being placed flipped (right becomes left)
 *
 * Returns: { canPlace: bool, flipped: bool }
 */
function canPlaceTile(boardEndValue, tile) {
  if (tile.left.value === boardEndValue) return { canPlace: true, flipped: false };
  if (tile.right.value === boardEndValue) return { canPlace: true, flipped: true };
  return { canPlace: false, flipped: false };
}

/**
 * Create a new game state
 */
function createGame(roomId, players, settings) {
  const { operations, mode } = settings;
  const allTiles = generateTiles(operations, mode);

  // Deal 10 tiles to each player
  const hands = {};
  let tileIndex = 0;
  for (const player of players) {
    hands[player.id] = allTiles.slice(tileIndex, tileIndex + 10);
    tileIndex += 10;
  }
  const drawPile = allTiles.slice(tileIndex);

  // Find the first tile to place: tile with highest single value or double
  // Or just use first tile from first player for simplicity
  // Actually: first player places first tile from their hand
  const firstPlayerId = players[0].id;
  const firstTile = hands[firstPlayerId][0];
  hands[firstPlayerId] = hands[firstPlayerId].slice(1);

  const chain = [{ ...firstTile, flipped: false }];

  return {
    roomId,
    players,
    hands,
    drawPile,
    chain,
    // leftEnd and rightEnd are the VALUES exposed at each end
    leftEnd: firstTile.left.value,
    rightEnd: firstTile.right.value,
    currentPlayerIndex: 1 % players.length,
    phase: 'playing', // 'playing' | 'finished'
    winner: null,
    settings,
    passCount: 0, // consecutive passes
  };
}

/**
 * Place a tile on the board.
 * Returns { success, state, message }
 */
function placeTile(state, playerId, tileId, end, flipped) {
  if (state.phase !== 'playing') return { success: false, message: 'Hra již skončila.' };
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return { success: false, message: 'Nejsi na tahu.' };

  const hand = state.hands[playerId];
  const tileIndex = hand.findIndex(t => t.id === tileId);
  if (tileIndex === -1) return { success: false, message: 'Kostičku nemáš v ruce.' };

  const tile = hand[tileIndex];
  const boardEndValue = end === 'left' ? state.leftEnd : state.rightEnd;

  // Determine orientation
  let placedFlipped = flipped;
  // Check if placement is valid
  const checkVal = placedFlipped ? tile.right.value : tile.left.value;
  const attachVal = placedFlipped ? tile.left.value : tile.right.value;

  if (checkVal !== boardEndValue) {
    return { success: false, message: `Kostička nepasuje. Potřebuješ ${boardEndValue}.` };
  }

  // Remove from hand
  const newHand = [...hand];
  newHand.splice(tileIndex, 1);

  // Add to chain
  const newChain = [...state.chain];
  const chainTile = { ...tile, flipped: placedFlipped };

  let newLeftEnd = state.leftEnd;
  let newRightEnd = state.rightEnd;

  if (end === 'left') {
    newChain.unshift(chainTile);
    newLeftEnd = attachVal;
  } else {
    newChain.push(chainTile);
    newRightEnd = attachVal;
  }

  const newHands = { ...state.hands, [playerId]: newHand };

  // Check win condition
  let phase = state.phase;
  let winner = state.winner;
  if (newHand.length === 0) {
    phase = 'finished';
    winner = playerId;
  }

  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

  const newState = {
    ...state,
    hands: newHands,
    chain: newChain,
    leftEnd: newLeftEnd,
    rightEnd: newRightEnd,
    currentPlayerIndex: nextPlayerIndex,
    phase,
    winner,
    passCount: 0,
  };

  return { success: true, state: newState };
}

/**
 * Draw a tile from the pile (when player cannot play)
 */
function drawTile(state, playerId) {
  if (state.phase !== 'playing') return { success: false, message: 'Hra již skončila.' };
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return { success: false, message: 'Nejsi na tahu.' };

  if (state.drawPile.length === 0) {
    // Pass turn
    const newPassCount = state.passCount + 1;
    if (newPassCount >= state.players.length) {
      // All players passed - game ends, player with fewest tiles wins
      let minTiles = Infinity;
      let winnerId = null;
      for (const p of state.players) {
        const count = state.hands[p.id].length;
        if (count < minTiles) {
          minTiles = count;
          winnerId = p.id;
        }
      }
      return {
        success: true,
        state: {
          ...state,
          phase: 'finished',
          winner: winnerId,
          passCount: newPassCount,
          currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
        },
        drew: null,
        message: 'Balíček je prázdný. Přeskočeno.',
      };
    }
    return {
      success: true,
      state: {
        ...state,
        passCount: newPassCount,
        currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
      },
      drew: null,
      message: 'Balíček je prázdný. Přeskočeno.',
    };
  }

  const newDrawPile = [...state.drawPile];
  const drawnTile = newDrawPile.pop();
  const newHand = [...state.hands[playerId], drawnTile];
  const newHands = { ...state.hands, [playerId]: newHand };

  // After drawing, it's still the same player's turn (they must try to play)
  return {
    success: true,
    state: {
      ...state,
      drawPile: newDrawPile,
      hands: newHands,
      passCount: 0,
    },
    drew: drawnTile,
  };
}

/**
 * Check if a player has any valid move
 */
function hasValidMove(state, playerId) {
  const hand = state.hands[playerId];
  for (const tile of hand) {
    const left = canPlaceTile(state.leftEnd, tile);
    const right = canPlaceTile(state.rightEnd, tile);
    if (left.canPlace || right.canPlace) return true;
  }
  return false;
}

module.exports = { generateTiles, createGame, placeTile, drawTile, hasValidMove, canPlaceTile };
