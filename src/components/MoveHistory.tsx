import { useGameStore } from '../store/gameStore';

export function MoveHistory() {
  const moveHistory = useGameStore((s) => s.moveHistory);

  const renderMoves = () => {
    const pairs: Array<[typeof moveHistory[0] | null, typeof moveHistory[0] | null]> = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      pairs.push([moveHistory[i] || null, moveHistory[i + 1] || null]);
    }

    return pairs.map((pair, idx) => (
      <div
        key={idx}
        className="flex gap-2 items-center py-1 px-2 border-b border-[#8B5A2B]/20 last:border-0 hover:bg-[#8B5A2B]/10 transition-colors"
      >
        <span className="text-[#8B5A2B]/60 w-8 text-right text-sm" style={{ fontFamily: 'KaiTi, 楷体, serif' }}>
          {idx + 1}.
        </span>
        {pair[0] && (
          <span
            className="text-sm flex-1 text-right"
            style={{
              color: '#C41E3A',
              fontFamily: "'STXingkai', '华文行楷', 'KaiTi', '楷体', serif",
            }}
          >
            {pair[0].notation}
          </span>
        )}
        {pair[1] && (
          <span
            className="text-sm flex-1"
            style={{
              color: '#2C1810',
              fontFamily: "'STXingkai', '华文行楷', 'KaiTi', '楷体', serif",
            }}
          >
            {pair[1].notation}
          </span>
        )}
      </div>
    ));
  };

  return (
    <div className="scroll-panel p-3 flex flex-col min-w-[160px] max-h-[500px]">
      <h3
        className="text-center text-[#5a3a1a] text-lg tracking-widest mb-2"
        style={{ fontFamily: "'STXingkai', '华文行楷', serif" }}
      >
        棋 谱
      </h3>
      <div className="overflow-y-auto flex-1 min-h-[200px]" style={{ maxHeight: 450 }}>
        {moveHistory.length === 0 ? (
          <div
            className="text-center text-[#8B5A2B]/50 py-8 text-sm"
            style={{ fontFamily: "'KaiTi', '楷体', serif" }}
          >
            尚未开局
          </div>
        ) : (
          renderMoves()
        )}
      </div>
    </div>
  );
}