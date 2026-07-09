import re

with open('frontend/src/components/wordDuel/DuelLobby.tsx', 'r') as f:
    content = f.read()

# Update Props
content = content.replace('onStartDaily: () => void;', 'onStartDaily: () => void;\n  onStartPractice: () => void;')

# Update signature
content = content.replace('{ onJoinQueue, onCreatePrivate, onJoinPrivate, onStartDaily, socketError }: DuelLobbyProps', '{ onJoinQueue, onCreatePrivate, onJoinPrivate, onStartDaily, onStartPractice, socketError }: DuelLobbyProps')

# Add Practice Button above Daily Challenge
practice_button = """      {/* Practice Mode */}
      <div 
        onClick={onStartPractice}
        className="w-full relative overflow-hidden rounded-2xl bg-[#0A0A0F] border-2 border-[#10B981]/50 cursor-pointer group hover:border-[#10B981] transition-all mb-4 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]"
      >
        <div className="absolute top-0 right-0 px-3 py-1 bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold rounded-bl-lg font-mono">
          FREE — No Wallet Needed
        </div>
        
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 flex items-center justify-center border border-[#10B981]/30">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h3 className="font-display font-extrabold text-white text-lg tracking-wide group-hover:text-[#10B981] transition-colors">
                PRACTICE ARENA
              </h3>
              <p className="text-[#10B981]/80 text-xs font-mono">Warm up your vocabulary</p>
            </div>
          </div>
          <div className="text-[#10B981]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </div>
      </div>
"""

content = content.replace('{/* Daily Challenge Header */}', practice_button + '\n      {/* Daily Challenge Header */}')

with open('frontend/src/components/wordDuel/DuelLobby.tsx', 'w') as f:
    f.write(content)
print("Success: DuelLobby.tsx updated")
