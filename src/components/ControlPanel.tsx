import { useGameStore } from '../store/gameStore';

export function ControlPanel() {
  const undoMove = useGameStore((s) => s.undoMove);
  const restart = useGameStore((s) => s.restart);
  const moveHistory = useGameStore((s) => s.moveHistory);
  const isAiThinking = useGameStore((s) => s.isAiThinking);

  return (
    <div className="panel-ancient p-4 flex flex-col gap-3 min-w-[160px]">
      <h3
        className="text-center text-[#B8860B] text-lg tracking-widest"
        style={{ fontFamily: "'STXingkai', '华文行楷', serif" }}
      >
        对弈操作
      </h3>

      <button
        onClick={undoMove}
        disabled={moveHistory.length < 2 || isAiThinking}
        className="btn-ancient px-4 py-2 rounded text-base disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ↩ 悔 棋
      </button>

      <button
        onClick={restart}
        className="btn-ancient px-4 py-2 rounded text-base"
      >
        ⟲ 重 开
      </button>

      {isAiThinking && (
        <div
          className="text-center text-[#B8860B]/80 text-sm animate-pulse"
          style={{ fontFamily: "'KaiTi', '楷体', serif" }}
        >
          黑方思索中...
        </div>
      )}
    </div>
  );
}