export type AgentState = 'idle' | 'working' | 'thinking' | 'waiting' | 'error';

interface AgentVisualizerProps {
  agentId: string;
  state: AgentState;
}

export default function AgentVisualizer({ agentId, state }: AgentVisualizerProps) {
  // Map states to CSS animation classes and props
  const stateConfig = {
    idle: {
      avatarClass: 'animate-[bounce_3s_infinite]',
      prop: '☕',
      propClass: 'animate-pulse',
      statusText: 'IDLE',
      textColor: 'text-gray-400',
      bgColor: 'bg-gray-500/10 border-gray-500/30'
    },
    working: {
      avatarClass: 'animate-[bounce_0.2s_infinite]',
      prop: '⌨️',
      propClass: 'animate-[bounce_0.3s_infinite]',
      statusText: 'WORKING',
      textColor: 'text-green-400',
      bgColor: 'bg-green-500/10 border-green-500/30'
    },
    thinking: {
      avatarClass: 'animate-pulse',
      prop: '⚙️',
      propClass: 'animate-spin',
      statusText: 'THINKING',
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/30'
    },
    waiting: {
      avatarClass: 'animate-[bounce_1s_infinite]',
      prop: '❓',
      propClass: 'animate-bounce',
      statusText: 'WAITING',
      textColor: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10 border-yellow-500/30'
    },
    error: {
      avatarClass: 'animate-[shake_0.5s_infinite] brightness-75 sepia-[0.5] hue-rotate-[-50deg] saturate-[5] contrast-[2]',
      prop: '🔥',
      propClass: 'animate-pulse',
      statusText: 'ERROR',
      textColor: 'text-red-400',
      bgColor: 'bg-red-500/10 border-red-500/30'
    }
  };

  const config = stateConfig[state];

  // We use DiceBear's bottts style (robots) which fits the tech/agent theme well
  // Alternatively, 'pixel-art' can be used. Let's use bottts for tech style.
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${agentId}`;

  return (
    <div className={`absolute bottom-6 right-6 flex flex-col items-center justify-center p-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 z-40 pointer-events-none ${config.bgColor}`}>
      {/* CRT Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden opacity-20">
        <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50"></div>
      </div>

      <div className="relative w-16 h-16 flex items-center justify-center mb-2">
        <img 
          src={avatarUrl} 
          alt={`Agent ${agentId}`} 
          className={`w-14 h-14 object-contain transition-all duration-300 ${config.avatarClass}`}
        />
        <div className={`absolute -top-1 -right-2 text-lg drop-shadow-md ${config.propClass}`}>
          {config.prop}
        </div>
      </div>
      
      <div className="flex flex-col items-center">
        <div className={`text-[10px] font-bold tracking-widest uppercase ${config.textColor} font-mono flex items-center gap-1.5`}>
          <span className={`w-1.5 h-1.5 rounded-full ${config.textColor.replace('text-', 'bg-')} ${state !== 'idle' ? 'animate-pulse' : ''}`}></span>
          {config.statusText}
        </div>
        <div className="text-[8px] text-white/30 font-mono mt-0.5 truncate max-w-[80px]">
          ID: {agentId.substring(0, 6)}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-5deg); }
          50% { transform: translateX(2px) rotate(5deg); }
          75% { transform: translateX(-2px) rotate(-5deg); }
        }
      `}</style>
    </div>
  );
}
