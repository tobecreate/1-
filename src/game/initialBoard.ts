import { Board, COLS, ROWS, Piece } from './types';

export function createInitialBoard(): Board {
  const board: Board = Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(null));

  const setupPiece = (row: number, col: number, type: Piece['type'], color: Piece['color']): void => {
    board[row][col] = { type, color, row, col };
  };

  // Black pieces (top, rows 0-4)
  setupPiece(0, 0, 'chariot', 'black');
  setupPiece(0, 1, 'horse', 'black');
  setupPiece(0, 2, 'elephant', 'black');
  setupPiece(0, 3, 'advisor', 'black');
  setupPiece(0, 4, 'king', 'black');
  setupPiece(0, 5, 'advisor', 'black');
  setupPiece(0, 6, 'elephant', 'black');
  setupPiece(0, 7, 'horse', 'black');
  setupPiece(0, 8, 'chariot', 'black');
  setupPiece(2, 1, 'cannon', 'black');
  setupPiece(2, 7, 'cannon', 'black');
  for (let c = 0; c < COLS; c += 2) {
    setupPiece(3, c, 'soldier', 'black');
  }

  // Red pieces (bottom, rows 5-9)
  setupPiece(9, 0, 'chariot', 'red');
  setupPiece(9, 1, 'horse', 'red');
  setupPiece(9, 2, 'elephant', 'red');
  setupPiece(9, 3, 'advisor', 'red');
  setupPiece(9, 4, 'king', 'red');
  setupPiece(9, 5, 'advisor', 'red');
  setupPiece(9, 6, 'elephant', 'red');
  setupPiece(9, 7, 'horse', 'red');
  setupPiece(9, 8, 'chariot', 'red');
  setupPiece(7, 1, 'cannon', 'red');
  setupPiece(7, 7, 'cannon', 'red');
  for (let c = 0; c < COLS; c += 2) {
    setupPiece(6, c, 'soldier', 'red');
  }

  return board;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) =>
    row.map((piece) => (piece ? { ...piece } : null))
  );
}