import { Board, PIECE_VALUE, Piece, PieceColor, Position } from './types';
import { getValidMoves, movePiece, isKingInCheck } from './rules';

function evaluateBoard(board: Board, aiColor: PieceColor): number {
  let score = 0;
  const opponentColor: PieceColor = aiColor === 'red' ? 'black' : 'red';

  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      let value = PIECE_VALUE[piece.type];

      // Position bonus for soldiers that have crossed the river
      if (piece.type === 'soldier') {
        const crossed = piece.color === 'red' ? piece.row <= 4 : piece.row >= 5;
        if (crossed) value += 50;
      }

      // Central control bonus for chariots and horses
      if (piece.type === 'chariot' || piece.type === 'horse' || piece.type === 'cannon') {
        const centerDist = Math.abs(c - 4);
        value += (4 - centerDist) * 5;
      }

      // King protection bonus
      if (piece.type === 'advisor' || piece.type === 'elephant') {
        value += 20;
      }

      score += piece.color === aiColor ? value : -value;
    }
  }

  // Check penalty
  if (isKingInCheck(board, opponentColor)) {
    score += 50;
  }
  if (isKingInCheck(board, aiColor)) {
    score -= 60;
  }

  return score;
}

function getAllMoves(board: Board, color: PieceColor): Array<{ piece: Piece; from: Position; to: Position }> {
  const allMoves: Array<{ piece: Piece; from: Position; to: Position }> = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const validMoves = getValidMoves(board, piece, true);
        for (const target of validMoves) {
          allMoves.push({ piece, from: { row: r, col: c }, to: target });
        }
      }
    }
  }
  return allMoves;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiColor: PieceColor
): number {
  if (depth === 0) {
    return evaluateBoard(board, aiColor);
  }

  const currentColor: PieceColor = maximizing ? aiColor : (aiColor === 'red' ? 'black' : 'red');
  const moves = getAllMoves(board, currentColor);

  if (moves.length === 0) {
    return maximizing ? -99999 : 99999;
  }

  // Sort moves by capture value for better pruning
  moves.sort((a, b) => {
    const aCapture = board[a.to.row][a.to.col];
    const bCapture = board[b.to.row][b.to.col];
    return (bCapture ? PIECE_VALUE[bCapture.type] : 0) - (aCapture ? PIECE_VALUE[aCapture.type] : 0);
  });

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const { board: newBoard } = movePiece(board, move.from, move.to);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, aiColor);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const { board: newBoard } = movePiece(board, move.from, move.to);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, aiColor);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function findBestMove(board: Board, aiColor: PieceColor, depth = 3): { from: Position; to: Position } | null {
  const moves = getAllMoves(board, aiColor);
  if (moves.length === 0) return null;

  // Sort moves: captures first, then by value
  moves.sort((a, b) => {
    const aCapture = board[a.to.row][a.to.col];
    const bCapture = board[b.to.row][b.to.col];
    return (bCapture ? PIECE_VALUE[bCapture.type] : 0) - (aCapture ? PIECE_VALUE[aCapture.type] : 0);
  });

  let bestMove = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  // Add slight randomness for variety on equal moves
  const candidates: Array<{ move: typeof moves[0]; score: number }> = [];

  for (const move of moves) {
    const { board: newBoard } = movePiece(board, move.from, move.to);
    const score = minimax(newBoard, depth - 1, alpha, beta, false, aiColor);
    candidates.push({ move, score });

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, score);
  }

  // Among moves within 10% of best score, pick randomly
  if (candidates.length > 1) {
    const threshold = bestScore - Math.abs(bestScore) * 0.1 - 50;
    const nearBest = candidates.filter((c) => c.score >= threshold);
    if (nearBest.length > 0) {
      const picked = nearBest[Math.floor(Math.random() * nearBest.length)];
      bestMove = picked.move;
    }
  }

  return { from: bestMove.from, to: bestMove.to };
}