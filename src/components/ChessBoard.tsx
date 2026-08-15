import { useGameStore } from '../store/gameStore';
import { ChessPiece } from './ChessPiece';
import { Position } from '../game/types';

export function ChessBoard() {
  const board = useGameStore((s) => s.board);
  const selectedPiece = useGameStore((s) => s.selectedPiece);
  const validMoves = useGameStore((s) => s.validMoves);
  const selectPiece = useGameStore((s) => s.selectPiece);
  const makeMove = useGameStore((s) => s.makeMove);
  const lastMove = useGameStore((s) => s.lastMove);
  const isCheck = useGameStore((s) => s.isCheck);
  const currentTurn = useGameStore((s) => s.currentTurn);

  const BOARD_PADDING = 30;
  const CELL_SIZE = 62;
  const PIECE_SIZE = 52;
  const COLS = 9;
  const ROWS = 10;

  const boardWidth = (COLS - 1) * CELL_SIZE + BOARD_PADDING * 2;
  const boardHeight = (ROWS - 1) * CELL_SIZE + BOARD_PADDING * 2;

  const handleCellClick = (row: number, col: number) => {
    const piece = board[row][col];
    if (selectedPiece) {
      // Check if clicking a valid move target
      const isValidTarget = validMoves.some((m) => m.row === row && m.col === col);
      if (isValidTarget) {
        makeMove({ row, col });
        return;
      }
      // If clicking own piece, select it instead
      if (piece && piece.color === currentTurn) {
        selectPiece(row, col);
        return;
      }
      // Otherwise deselect
      selectPiece(-1, -1);
    } else {
      if (piece) {
        selectPiece(row, col);
      }
    }
  };

  const getValidMoveForCell = (row: number, col: number): Position | undefined => {
    return validMoves.find((m) => m.row === row && m.col === col);
  };

  const isLastMoveCell = (row: number, col: number): boolean => {
    if (!lastMove) return false;
    return (
      (lastMove.from.row === row && lastMove.from.col === col) ||
      (lastMove.to.row === row && lastMove.to.col === col)
    );
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className="rice-paper relative rounded-sm"
        style={{
          width: boardWidth,
          height: boardHeight,
          padding: BOARD_PADDING,
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 80px rgba(184,134,11,0.15)',
          border: '3px solid #8B5A2B',
        }}
      >
        {/* SVG grid lines */}
        <svg
          className="absolute pointer-events-none"
          style={{
            left: BOARD_PADDING,
            top: BOARD_PADDING,
            width: (COLS - 1) * CELL_SIZE,
            height: (ROWS - 1) * CELL_SIZE,
          }}
          viewBox={`0 0 ${(COLS - 1) * CELL_SIZE} ${(ROWS - 1) * CELL_SIZE}`}
        >
          {/* Horizontal lines */}
          {Array.from({ length: ROWS }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={i * CELL_SIZE}
              x2={(COLS - 1) * CELL_SIZE}
              y2={i * CELL_SIZE}
              stroke="#5a3a1a"
              strokeWidth={1.5}
            />
          ))}

          {/* Vertical lines (full and partial for river) */}
          {Array.from({ length: COLS }).map((_, i) => {
            if (i === 0 || i === COLS - 1) {
              return (
                <line
                  key={`v-${i}`}
                  x1={i * CELL_SIZE}
                  y1={0}
                  x2={i * CELL_SIZE}
                  y2={(ROWS - 1) * CELL_SIZE}
                  stroke="#5a3a1a"
                  strokeWidth={1.5}
                />
              );
            }
            return (
              <g key={`v-${i}`}>
                <line
                  x1={i * CELL_SIZE}
                  y1={0}
                  x2={i * CELL_SIZE}
                  y2={4 * CELL_SIZE}
                  stroke="#5a3a1a"
                  strokeWidth={1.5}
                />
                <line
                  x1={i * CELL_SIZE}
                  y1={5 * CELL_SIZE}
                  x2={i * CELL_SIZE}
                  y2={(ROWS - 1) * CELL_SIZE}
                  stroke="#5a3a1a"
                  strokeWidth={1.5}
                />
              </g>
            );
          })}

          {/* Palace diagonals - top */}
          <line x1={3 * CELL_SIZE} y1={0} x2={5 * CELL_SIZE} y2={2 * CELL_SIZE} stroke="#5a3a1a" strokeWidth={1.5} />
          <line x1={5 * CELL_SIZE} y1={0} x2={3 * CELL_SIZE} y2={2 * CELL_SIZE} stroke="#5a3a1a" strokeWidth={1.5} />
          {/* Palace diagonals - bottom */}
          <line x1={3 * CELL_SIZE} y1={7 * CELL_SIZE} x2={5 * CELL_SIZE} y2={9 * CELL_SIZE} stroke="#5a3a1a" strokeWidth={1.5} />
          <line x1={5 * CELL_SIZE} y1={7 * CELL_SIZE} x2={3 * CELL_SIZE} y2={9 * CELL_SIZE} stroke="#5a3a1a" strokeWidth={1.5} />

          {/* River text */}
          <text
            x={1.5 * CELL_SIZE}
            y={4.65 * CELL_SIZE}
            fill="#5a3a1a"
            fontSize="24"
            fontFamily="'STXingkai', '华文行楷', serif"
            opacity={0.7}
          >
            楚 河
          </text>
          <text
            x={5.8 * CELL_SIZE}
            y={4.65 * CELL_SIZE}
            fill="#5a3a1a"
            fontSize="24"
            fontFamily="'STXingkai', '华文行楷', serif"
            opacity={0.7}
          >
            漢 界
          </text>
        </svg>

        {/* Cell click targets + move hints */}
        {board.map((row, ri) =>
          row.map((piece, ci) => {
            const x = BOARD_PADDING + ci * CELL_SIZE;
            const y = BOARD_PADDING + ri * CELL_SIZE;
            const validMove = getValidMoveForCell(ri, ci);
            const isHint = validMove !== undefined;
            const isCapture = isHint && piece !== null;
            const isLastMoveCellHere = isLastMoveCell(ri, ci);
            const isCheckCell = isCheck && piece?.type === 'king' && piece.color === currentTurn;

            return (
              <div
                key={`${ri}-${ci}`}
                className="absolute cursor-pointer"
                style={{
                  left: x - CELL_SIZE / 2,
                  top: y - CELL_SIZE / 2,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  zIndex: 5,
                }}
                onClick={() => handleCellClick(ri, ci)}
              >
                {/* Last move highlight */}
                {isLastMoveCellHere && (
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: PIECE_SIZE + 10,
                      height: PIECE_SIZE + 10,
                      background: 'radial-gradient(circle, rgba(184,134,11,0.25) 0%, transparent 70%)',
                      border: '1px dashed rgba(184,134,11,0.5)',
                    }}
                  />
                )}

                {/* Check highlight */}
                {isCheckCell && (
                  <div
                    className="absolute rounded-full pointer-events-none animate-pulse"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: PIECE_SIZE + 16,
                      height: PIECE_SIZE + 16,
                      background: 'radial-gradient(circle, rgba(196,30,58,0.35) 0%, transparent 70%)',
                      border: '2px solid rgba(196,30,58,0.7)',
                    }}
                  />
                )}

                {/* Move hint */}
                {isHint && !piece && (
                  <div
                    className="absolute move-hint rounded-full pointer-events-none"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 20,
                      height: 20,
                    }}
                  />
                )}

                {/* Capture hint */}
                {isCapture && (
                  <div
                    className="absolute capture-hint rounded-full pointer-events-none"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: PIECE_SIZE + 8,
                      height: PIECE_SIZE + 8,
                    }}
                  />
                )}

                {/* Piece */}
                {piece && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <ChessPiece
                      piece={piece}
                      isSelected={
                        selectedPiece?.row === ri && selectedPiece?.col === ci
                      }
                      size={PIECE_SIZE}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}