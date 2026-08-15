import { useGameStore } from '../store/gameStore';

export function GameStatus() {
  const currentTurn = useGameStore((s) => s.currentTurn);
  const status = useGameStore((s) => s.status);
  const isCheck = useGameStore((s) => s.isCheck);
  const moveHistory = useGameStore((s) => s.moveHistory);

  const getStatusText = () => {
    if (status === 'red_won') return '红方胜！';
    if (status === 'black_won') return '黑方胜！';
    if (status === 'draw') return '和棋！';
    return currentTurn === 'red' ? '红方行棋' : '黑方行棋';
  };

  const getSealColor = () => {
    if (status === 'red_won') return '#C41E3A';
    if (status === 'black_won') return '#2C1810';
    return currentTurn === 'red' ? '#C41E3A' : '#2C1810';
  };

  return (
    <div className="panel-ancient p-4 flex flex-col items-center gap-3 min-w-[160px]">
      <h3
        className="text-center text-[#B8860B] text-lg tracking-widest"
        style={{ fontFamily: "'STXingkai', '华文行楷', serif" }}
      >
        棋局状态
      </h3>

      {/* Turn indicator */}
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full"
          style={{
            backgroundColor: status !== 'playing' ? '#666' : currentTurn === 'red' ? '#C41E3A' : '#2C1810',
            boxShadow: status === 'playing' ? `0 0 10px ${getSealColor()}` : 'none',
          }}
        />
        <span
          className="text-lg"
          style={{
            color: status === 'playing' ? (currentTurn === 'red' ? '#e74c3c' : '#2C1810') : '#B8860B',
            fontFamily: "'STXingkai', '华文行楷', serif",
          }}
        >
          {getStatusText()}
        </span>
      </div>

      {/* Check indicator */}
      {isCheck && status === 'playing' && (
        <div
          className="seal-red px-3 py-1 rounded text-sm font-bold animate-pulse"
          style={{ fontFamily: "'STXingkai', '华文行楷', serif" }}
        >
          将 军！
        </div>
      )}

      {/* Move counter */}
      <div
        className="text-[#B8860B]/70 text-sm mt-2"
        style={{ fontFamily: "'KaiTi', '楷体', serif" }}
      >
        第 {Math.ceil(moveHistory.length / 2)} 回合
      </div>
    </div>
  );
}