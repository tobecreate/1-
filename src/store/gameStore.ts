import { create } from 'zustand';
import { Board, Move, Piece, PIECE_CHINESE, Position } from '../game/types';
import { createInitialBoard } from '../game/initialBoard';
import { getValidMoves, movePiece, isCheckmate, hasAnyLegalMove, isKingInCheck } from '../game/rules';
import { findBestMove } from '../game/ai';

type GameStatus = 'playing' | 'red_won' | 'black_won' | 'draw';

interface GameState {
  board: Board;
  currentTurn: 'red' | 'black';
  selectedPiece: Piece | null;
  validMoves: Position[];
  moveHistory: Move[];
  status: GameStatus;
  isCheck: boolean;
  lastMove: { from: Position; to: Position } | null;
  isAiThinking: boolean;
  // Actions
  selectPiece: (row: number, col: number) => void;
  makeMove: (to: Position) => void;
  undoMove: () => void;
  restart: () => void;
  aiMove: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  board: createInitialBoard(),
  currentTurn: 'red',
  selectedPiece: null,
  validMoves: [],
  moveHistory: [],
  status: 'playing',
  isCheck: false,
  lastMove: null,
  isAiThinking: false,

  selectPiece: (row, col) => {
    const { board, currentTurn, selectedPiece } = get();
    if (get().status !== 'playing') return;
    if (currentTurn !== 'red') return;

    const piece = board[row][col];
    if (!piece) {
      set({ selectedPiece: null, validMoves: [] });
      return;
    }

    if (piece.color !== currentTurn) {
      set({ selectedPiece: null, validMoves: [] });
      return;
    }

    if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
      set({ selectedPiece: null, validMoves: [] });
    } else {
      const validMoves = getValidMoves(board, piece, true);
      set({ selectedPiece: piece, validMoves });
    }
  },

  makeMove: (to) => {
    const { board, selectedPiece, currentTurn, moveHistory } = get();
    if (!selectedPiece) return;

    const validMoves = getValidMoves(board, selectedPiece, true);
    const isValidMove = validMoves.some((m) => m.row === to.row && m.col === to.col);
    if (!isValidMove) return;

    const { board: newBoard, captured } = movePiece(board, { row: selectedPiece.row, col: selectedPiece.col }, to);
    
    // Generate notation
    const notation = generateNotation(selectedPiece, to, captured, board);
    
    const move: Move = {
      from: { row: selectedPiece.row, col: selectedPiece.col },
      to,
      piece: selectedPiece,
      captured,
      notation,
    };

    const nextTurn = currentTurn === 'red' ? 'black' : 'red';
    const inCheck = isKingInCheck(newBoard, nextTurn);
    const checkmate = isCheckmate(newBoard, nextTurn);
    const hasMove = hasAnyLegalMove(newBoard, nextTurn);

    let status: GameStatus = 'playing';
    if (checkmate) {
      status = currentTurn === 'red' ? 'red_won' : 'black_won';
    } else if (!hasMove) {
      status = 'draw';
    }

    set({
      board: newBoard,
      currentTurn: nextTurn,
      selectedPiece: null,
      validMoves: [],
      moveHistory: [...moveHistory, move],
      isCheck: inCheck,
      status,
      lastMove: { from: { row: selectedPiece.row, col: selectedPiece.col }, to },
    });

    // If it's black's turn and game not over, trigger AI
    if (nextTurn === 'black' && status === 'playing') {
      setTimeout(() => {
        get().aiMove();
      }, 500);
    }
  },

  undoMove: () => {
    const { moveHistory } = get();
    if (moveHistory.length < 2) return; // Need at least player move + AI move

    const newHistory = moveHistory.slice(0, -2);
    const newBoard = createInitialBoard();

    // Replay all moves except last two
    let currentBoard = newBoard;
    for (const move of newHistory) {
      const result = movePiece(currentBoard, move.from, move.to);
      currentBoard = result.board;
    }

    const currentTurn: 'red' | 'black' = newHistory.length % 2 === 0 ? 'red' : 'black';
    const inCheck = isKingInCheck(currentBoard, currentTurn);

    set({
      board: currentBoard,
      currentTurn,
      selectedPiece: null,
      validMoves: [],
      moveHistory: newHistory,
      status: 'playing',
      isCheck: inCheck,
      lastMove: newHistory.length > 0
        ? { from: newHistory[newHistory.length - 1].from, to: newHistory[newHistory.length - 1].to }
        : null,
    });
  },

  restart: () => {
    set({
      board: createInitialBoard(),
      currentTurn: 'red',
      selectedPiece: null,
      validMoves: [],
      moveHistory: [],
      status: 'playing',
      isCheck: false,
      lastMove: null,
      isAiThinking: false,
    });
  },

  aiMove: () => {
    const { board, currentTurn, status } = get();
    if (status !== 'playing' || currentTurn !== 'black') return;

    set({ isAiThinking: true });

    setTimeout(() => {
      const bestMove = findBestMove(board, 'black', 3);
      if (!bestMove) {
        set({ status: 'red_won', isAiThinking: false });
        return;
      }

      const piece = board[bestMove.from.row][bestMove.from.col]!;
      const { board: newBoard, captured } = movePiece(board, bestMove.from, bestMove.to);

      const notation = generateNotation(piece, bestMove.to, captured, board);
      const move: Move = {
        from: bestMove.from,
        to: bestMove.to,
        piece,
        captured,
        notation,
      };

      const nextTurn: 'red' | 'black' = 'red';
      const inCheck = isKingInCheck(newBoard, nextTurn);
      const checkmate = isCheckmate(newBoard, nextTurn);
      const hasMove = hasAnyLegalMove(newBoard, nextTurn);

      let statusNew: GameStatus = 'playing';
      if (checkmate) {
        statusNew = 'black_won';
      } else if (!hasMove) {
        statusNew = 'draw';
      }

      set((state) => ({
        board: newBoard,
        currentTurn: nextTurn,
        moveHistory: [...state.moveHistory, move],
        isCheck: inCheck,
        status: statusNew,
        lastMove: { from: bestMove.from, to: bestMove.to },
        isAiThinking: false,
      }));
    }, 600);
  },
}));

function generateNotation(piece: Piece, to: Position, captured: Piece | null, _board: Board): string {
  const chinese = PIECE_CHINESE[piece.color][piece.type];
  const col = piece.color === 'red' ? 9 - piece.col : piece.col + 1;
  const targetCol = piece.color === 'red' ? 9 - to.col : to.col + 1;
  const action = captured ? '吃' : '平';
  return `${chinese}${col}${action}${targetCol}`;
}