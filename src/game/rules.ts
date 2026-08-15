import { Board, COLS, Position, ROWS, Piece, PieceColor, PieceType } from './types';

function isInBoard(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function isInPalace(row: number, col: number, color: PieceColor): boolean {
  if (col < 3 || col > 5) return false;
  if (color === 'red') return row >= 7 && row <= 9;
  return row >= 0 && row <= 2;
}

function hasCrossedRiver(row: number, color: PieceColor): boolean {
  return color === 'red' ? row <= 4 : row >= 5;
}

function isOwnSide(row: number, color: PieceColor): boolean {
  return color === 'red' ? row >= 5 : row <= 4;
}

function getPieceAt(board: Board, pos: Position): Piece | null {
  return board[pos.row]?.[pos.col] ?? null;
}

export function getValidMoves(
  board: Board,
  piece: Piece,
  captureCheck = true
): Position[] {
  const moves: Position[] = [];
  const { row, col, type, color } = piece;

  switch (type) {
    case 'king':
      getKingMoves(board, piece, moves);
      break;
    case 'advisor':
      getAdvisorMoves(board, piece, moves);
      break;
    case 'elephant':
      getElephantMoves(board, piece, moves);
      break;
    case 'horse':
      getHorseMoves(board, piece, moves);
      break;
    case 'chariot':
      getChariotMoves(board, piece, moves);
      break;
    case 'cannon':
      getCannonMoves(board, piece, moves);
      break;
    case 'soldier':
      getSoldierMoves(board, piece, moves);
      break;
  }

  if (captureCheck) {
    // Filter out moves that leave own king in check
    return moves.filter((target) => {
      const testBoard = cloneBoardInternal(board);
      testBoard[target.row][target.col] = testBoard[row][col];
      testBoard[row][col] = null;
      testBoard[target.row][target.col]!.row = target.row;
      testBoard[target.row][target.col]!.col = target.col;
      return !isKingInCheck(testBoard, color);
    });
  }

  return moves;
}

function cloneBoardInternal(board: Board): Board {
  return board.map((r) => r.map((p) => (p ? { ...p } : null)));
}

function canMoveTo(board: Board, from: Piece, toRow: number, toCol: number): boolean {
  if (!isInBoard(toRow, toCol)) return false;
  const target = board[toRow][toCol];
  if (target && target.color === from.color) return false;
  return true;
}

function getKingMoves(board: Board, piece: Piece, moves: Position[]): void {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const nr = piece.row + dr;
    const nc = piece.col + dc;
    if (isInPalace(nr, nc, piece.color) && canMoveTo(board, piece, nr, nc)) {
      moves.push({ row: nr, col: nc });
    }
  }
  // Flying general rule
  const opponentColor: PieceColor = piece.color === 'red' ? 'black' : 'red';
  const opponentKing = findKing(board, opponentColor);
  if (opponentKing && opponentKing.col === piece.col) {
    const minRow = Math.min(piece.row, opponentKing.row) + 1;
    const maxRow = Math.max(piece.row, opponentKing.row);
    let blocked = false;
    for (let r = minRow; r < maxRow; r++) {
      if (board[r][piece.col]) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      moves.push({ row: opponentKing.row, col: opponentKing.col });
    }
  }
}

function getAdvisorMoves(board: Board, piece: Piece, moves: Position[]): void {
  const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of dirs) {
    const nr = piece.row + dr;
    const nc = piece.col + dc;
    if (isInPalace(nr, nc, piece.color) && canMoveTo(board, piece, nr, nc)) {
      moves.push({ row: nr, col: nc });
    }
  }
}

function getElephantMoves(board: Board, piece: Piece, moves: Position[]): void {
  const dirs = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
  for (const [dr, dc] of dirs) {
    const nr = piece.row + dr;
    const nc = piece.col + dc;
    if (!isInBoard(nr, nc)) continue;
    if (!isOwnSide(nr, piece.color)) continue; // Cannot cross river
    // Check for blocked elephant eye
    const er = piece.row + dr / 2;
    const ec = piece.col + dc / 2;
    if (board[er][ec]) continue;
    if (canMoveTo(board, piece, nr, nc)) {
      moves.push({ row: nr, col: nc });
    }
  }
}

function getHorseMoves(board: Board, piece: Piece, moves: Position[]): void {
  const patterns: Array<[number, number, number, number]> = [
    [-2, -1, -1, 0], [-2, 1, -1, 0],
    [2, -1, 1, 0], [2, 1, 1, 0],
    [-1, -2, 0, -1], [1, -2, 0, -1],
    [-1, 2, 0, 1], [1, 2, 0, 1],
  ];
  for (const [dr, dc, br, bc] of patterns) {
    const nr = piece.row + dr;
    const nc = piece.col + dc;
    if (!isInBoard(nr, nc)) continue;
    // Check for hobbled horse leg
    if (board[piece.row + br]?.[piece.col + bc]) continue;
    if (canMoveTo(board, piece, nr, nc)) {
      moves.push({ row: nr, col: nc });
    }
  }
}

function getChariotMoves(board: Board, piece: Piece, moves: Position[]): void {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    let nr = piece.row + dr;
    let nc = piece.col + dc;
    while (isInBoard(nr, nc)) {
      const target = board[nr][nc];
      if (!target) {
        moves.push({ row: nr, col: nc });
      } else {
        if (target.color !== piece.color) {
          moves.push({ row: nr, col: nc });
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
}

function getCannonMoves(board: Board, piece: Piece, moves: Position[]): void {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    let nr = piece.row + dr;
    let nc = piece.col + dc;
    // Non-capturing moves
    while (isInBoard(nr, nc) && !board[nr][nc]) {
      moves.push({ row: nr, col: nc });
      nr += dr;
      nc += dc;
    }
    // Find platform and then check for capture
    if (isInBoard(nr, nc)) {
      nr += dr;
      nc += dc;
      while (isInBoard(nr, nc)) {
        const target = board[nr][nc];
        if (target) {
          if (target.color !== piece.color) {
            moves.push({ row: nr, col: nc });
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }
}

function getSoldierMoves(board: Board, piece: Piece, moves: Position[]): void {
  const forward = piece.color === 'red' ? -1 : 1;
  const nr = piece.row + forward;
  const nc = piece.col;
  if (isInBoard(nr, nc) && canMoveTo(board, piece, nr, nc)) {
    moves.push({ row: nr, col: nc });
  }
  // After crossing river, can move sideways
  if (hasCrossedRiver(piece.row, piece.color)) {
    for (const dc of [-1, 1]) {
      const snr = piece.row;
      const snc = piece.col + dc;
      if (isInBoard(snr, snc) && canMoveTo(board, piece, snr, snc)) {
        moves.push({ row: snr, col: snc });
      }
    }
  }
}

function findKing(board: Board, color: PieceColor): Piece | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.color === color) return p;
    }
  }
  return null;
}

export function isKingInCheck(board: Board, color: PieceColor): boolean {
  const king = findKing(board, color);
  if (!king) return true;
  const opponentColor: PieceColor = color === 'red' ? 'black' : 'red';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (piece && piece.color === opponentColor) {
        const moves = getValidMoves(board, piece, false);
        if (moves.some((m) => m.row === king.row && m.col === king.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function isCheckmate(board: Board, color: PieceColor): boolean {
  if (!isKingInCheck(board, color)) return false;
  // Check if any move can escape check
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const moves = getValidMoves(board, piece, true);
        if (moves.length > 0) return false;
      }
    }
  }
  return true;
}

export function hasAnyLegalMove(board: Board, color: PieceColor): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const moves = getValidMoves(board, piece, true);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

export function movePiece(board: Board, from: Position, to: Position): { board: Board; captured: Piece | null } {
  const newBoard = cloneBoardInternal(board);
  const piece = newBoard[from.row][from.col];
  const captured = newBoard[to.row][to.col];
  if (piece) {
    newBoard[to.row][to.col] = { ...piece, row: to.row, col: to.col, hasMoved: true };
    newBoard[from.row][from.col] = null;
  }
  return { board: newBoard, captured };
}

export function getPieceType(type: PieceType): PieceType {
  return type;
}