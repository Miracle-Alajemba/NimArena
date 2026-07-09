import re

with open('frontend/src/components/trivia/TriviaLobby.tsx', 'r') as f:
    content = f.read()

# Add finalizeTrivia to destructured useContract
if "finalizeTrivia" not in content:
    content = content.replace("const { enterTrivia, createTriviaRound, txLoading, txError } = useContract();", "const { enterTrivia, createTriviaRound, finalizeTrivia, txLoading, txError } = useContract();")

# Replace onClick
old_onclick = """                    onClick={() => {
                      if (txLoading) return;
                      const { finalizeTrivia } = useContract(); // Wait, hooks can't be called in callbacks, it's already destructured at top
                      // I need to use the finalizeTrivia from useContract that should be at the top of TriviaLobby
                    }}"""
new_onclick = """                    onClick={async () => {
                      if (txLoading) return;
                      await finalizeTrivia(round.roundId);
                      fetchRounds();
                    }}"""

if old_onclick in content:
    content = content.replace(old_onclick, new_onclick)
    with open('frontend/src/components/trivia/TriviaLobby.tsx', 'w') as f:
        f.write(content)
    print("Success: onClick fixed")
else:
    print("Error: onClick not found")
