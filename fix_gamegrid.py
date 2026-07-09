import re

with open('frontend/src/components/lobby/GameGrid.tsx', 'r') as f:
    content = f.read()

# Update Props
content = content.replace('onSelectGame: (game: "word_duel" | "speed_trivia") => void;', 'onSelectGame: (game: "word_duel" | "speed_trivia" | "practice_arena") => void;')

# Add Practice Arena Card
practice_card = """      {/* Practice Arena Card */}
      <div 
        onClick={() => onSelectGame("practice_arena")}
        className="relative overflow-hidden rounded-2xl bg-[#0A0A0F] border-2 border-[#10B981]/50 cursor-pointer group hover:border-[#10B981] transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]"
      >
        <div className="absolute top-0 right-0 px-3 py-1 bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold rounded-bl-lg font-mono">
          FREE — No Wallet Needed
        </div>
        
        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
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
          
          <p className="text-gray-400 text-sm mb-4">
            Test your skills without risking any tokens. Try to get the longest word in 60 seconds!
          </p>
          
          <div className="flex items-center justify-between border-t border-[#1F1F2E] pt-3">
             <div className="text-xs text-gray-500 font-medium">Single Player</div>
             <div className="flex items-center gap-1 text-[#10B981] text-xs font-bold bg-[#10B981]/10 px-2 py-1 rounded">
               Play Now <span className="text-[10px]">→</span>
             </div>
          </div>
        </div>
      </div>
"""

# Insert before "Number Rush" card
content = content.replace('{/* Number Rush (Coming Soon) */}', practice_card + '\n      {/* Number Rush (Coming Soon) */}')

with open('frontend/src/components/lobby/GameGrid.tsx', 'w') as f:
    f.write(content)
print("Success: GameGrid.tsx updated")
