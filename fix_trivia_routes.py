with open('backend/src/routes/trivia.ts', 'r') as f:
    content = f.read()

practice_endpoint = """// GET /api/trivia/practice/questions
router.get("/practice/questions", async (req: Request, res: Response) => {
  try {
    const totalQuestions = await prisma.triviaQuestion.count();
    if (totalQuestions < 10) {
      return res.status(500).json({ error: "Not enough questions in database." });
    }

    // Fetch all question IDs
    const allQuestions = await prisma.triviaQuestion.findMany({
      select: { id: true }
    });
    
    // Pick 10 random IDs
    const shuffled = allQuestions.map(q => q.id).sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, 10);

    // Fetch the actual questions
    const questions = await prisma.triviaQuestion.findMany({
      where: {
        id: { in: selectedIds }
      },
      select: {
        id: true,
        question: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctIdx: true, // We return correctIdx for client-side evaluation
        category: true,
        difficulty: true
      }
    });

    // Shuffle the result to match the random selected order (findMany doesn't preserve IN order)
    const sortedQuestions = selectedIds.map(id => questions.find(q => q.id === id)).filter(Boolean);

    return res.json(sortedQuestions);
  } catch (error) {
    console.error("TriviaService: Failed to fetch practice questions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

"""

content = content.replace('// POST /api/trivia/session/start', practice_endpoint + '// POST /api/trivia/session/start')

with open('backend/src/routes/trivia.ts', 'w') as f:
    f.write(content)
print("Success: trivia routes updated")
