import { ChessBoard } from '../components/ChessBoard';
import { ControlPanel } from '../components/ControlPanel';
import { GameStatus } from '../components/GameStatus';
import { MoveHistory } from '../components/MoveHistory';
import { useGameStore } from '../store/gameStore';

export function Game() {
  const status = useGameStore((s) => s.status);
  const restart = useGameStore((s) => s.restart);

  return (
    <div className="w-full h-full ink-bg flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Ink wash corners */}
        <div
          className="absolute -top-20 -left-20 w-80 h-80 opacity-10"
          style={{
            background: 'radial-gradient(circle, #B8860B 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-80 h-80 opacity-10"
          style={{
            background: 'radial-gradient(circle, #8B3A3A 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Decorative border pattern */}
        <div
          className="absolute inset-4 border border-[#B8860B]/10 rounded-sm"
          style={{
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)',
          }}
        />

        {/* Title */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center">
          <h1
            className="text-4xl text-[#B8860B] tracking-[0.3em] text-shadow-gold"
            style={{ fontFamily: "'STXingkai', '华文行楷', serif" }}
          >
            中國象棋
          </h1>
          <p
            className="text-[#B8860B]/60 text-sm mt-1 tracking-[0.2em]"
            style={{ fontFamily: "'KaiTi', '楷体', serif" }}
          >
            千年国粹 · 雅弈之道
          </p>
        </div>
      </div>

      {/* Main game area */}
      <div className="flex items-start justify-center gap-8 mt-24 relative z-10">
        {/* Left panel */}
        <div className="flex flex-col gap-4">
          <GameStatus />
          <ControlPanel />
        </div>

        {/* Chess board */}
        <div className="relative">
          <ChessBoard />

          {/* Game over overlay */}
          {status !== 'playing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-sm">
              <div className="panel-ancient p-8 text-center">
                <div
                  className="text-5xl mb-4"
                  style={{
                    color: status === 'red_won' ? '#C41E3A' : status === 'black_won' ? '#F5E6C8' : '#B8860B',
                    fontFamily: "'STXingkai', '华文行楷', serif",
                    textShadow: '0 0 20px currentColor',
                  }}
                >
                  {status === 'red_won' && '红方胜 !'}
                  {status === 'black_won' && '黑方胜 !'}
                  {status === 'draw' && '和 棋 !'}
                </div>
                <button
                  onClick={restart}
                  className="btn-ancient px-8 py-3 rounded text-lg"
                >
                  再 来 一 局
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - move history */}
        <div className="flex flex-col gap-4">
          <MoveHistory />
          <div className="panel-ancient p-3 text-center">
            <p
              className="text-[#B8860B]/70 text-xs leading-relaxed"
              style={{ fontFamily: "'KaiTi', '楷体', serif" }}
            >
              红方先行<br/>
              点击棋子选择<br/>
              点击位置走子
            </p>
          </div>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[#B8860B]/40 text-xs tracking-widest" style={{ fontFamily: "'KaiTi', '楷体', serif" }}>
        ━━━━━━━━  观 棋 有 得  ━━━━━━━━
      </div>
    </div>
  );
}