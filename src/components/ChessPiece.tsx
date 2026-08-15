import { Piece, PIECE_CHINESE } from '../game/types';

interface ChessPieceProps {
  piece: Piece;
  isSelected?: boolean;
  onClick?: () => void;
  size?: number;
}

export function ChessPiece({ piece, isSelected, onClick, size = 52 }: ChessPieceProps) {
  const chineseChar = PIECE_CHINESE[piece.color][piece.type];
  const isRed = piece.color === 'red';

  return (
    <div
      onClick={onClick}
      className={`
        chess-piece absolute cursor-pointer select-none
        ${isRed ? 'wood-piece-red' : 'wood-piece-black'}
        ${isSelected ? 'piece-selected' : ''}
        transition-all duration-200 ease-out
        hover:brightness-110 active:scale-95
      `}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
    >
      <span
        className={`font-bold ${isRed ? 'text-[#C41E3A]' : 'text-[#2C1810]'}`}
        style={{
          fontFamily: "'STXingkai', '华文行楷', 'KaiTi', '楷体', serif",
          fontSize: size * 0.55,
          textShadow: isRed
            ? '0 1px 2px rgba(139, 58, 58, 0.3), 0 0 1px rgba(196, 30, 58, 0.5)'
            : '0 1px 2px rgba(44, 24, 16, 0.3), 0 0 1px rgba(44, 24, 16, 0.5)',
          lineHeight: 1,
        }}
      >
        {chineseChar}
      </span>
    </div>
  );
}