import asyncio
from playwright.async_api import async_playwright
import time

# Injected JS for AI logic
SMART_AI_JS = """
window.smartAI = {
    getAdjacents: window.getAdjacents, // Use game's function

    // Simulate a move and return result
    simulate: function(boardState, handCard, cellIdx, ownerId) {
        // boardState: array of card objects or null
        // handCard: card object (from hand)
        // cellIdx: index to place
        // ownerId: 1 or 2

        // Deep clone board to avoid side effects
        const newBoard = boardState.map(c => c ? { ...c, stats: {...c.stats}, owner: c.owner } : null);

        // Create the placed card
        const card = { ...handCard, stats: {...handCard.stats}, owner: ownerId };
        newBoard[cellIdx] = card;

        // Replicate game logic (getAdjacents is global)
        const adjs = window.getAdjacents(cellIdx);
        const targets = adjs.map(a => ({ ...a, card: newBoard[a.idx] })).filter(t => t.card);

        let flips = new Set();
        let specialFlips = new Set(); // For combo

        // SAME
        const sameMatches = targets.filter(t => card.stats[t.side] === t.card.stats[t.opp]);
        if (sameMatches.length >= 2) {
            sameMatches.forEach(m => {
                if (m.card.owner !== ownerId) {
                    flips.add(m.idx);
                    specialFlips.add(m.idx);
                }
            });
        }

        // PLUS
        const sums = {};
        targets.forEach(t => {
            const s = card.stats[t.side] + t.card.stats[t.opp];
            if (!sums[s]) sums[s] = [];
            sums[s].push(t);
        });

        for (const s in sums) {
            if (sums[s].length >= 2) {
                sums[s].forEach(m => {
                    if (m.card.owner !== ownerId) {
                        flips.add(m.idx);
                        specialFlips.add(m.idx);
                    }
                });
            }
        }

        // NORMAL FLIPS
        targets.forEach(t => {
            if (t.card.owner !== ownerId && card.stats[t.side] > t.card.stats[t.opp]) {
                flips.add(t.idx);
            }
        });

        // Apply Flips
        flips.forEach(idx => {
            newBoard[idx].owner = ownerId;
        });

        // COMBO
        let comboQueue = [...specialFlips];
        while (comboQueue.length > 0) {
            const cIdx = comboQueue.shift();
            const cCard = newBoard[cIdx];
            const cAdjs = window.getAdjacents(cIdx);

            for (const adj of cAdjs) {
                const target = newBoard[adj.idx];
                if (target && target.owner !== ownerId) {
                    // Combo rule: simple beat check
                    if (cCard.stats[adj.side] > target.stats[adj.opp]) {
                        if (!flips.has(adj.idx)) { // Avoid re-flipping/loops? Game doesn't check this explicitly but owner check handles it
                             newBoard[adj.idx].owner = ownerId;
                             flips.add(adj.idx);
                             comboQueue.push(adj.idx);
                        }
                    }
                }
            }
        }

        // Score: Number of cards owned by me
        const score = newBoard.filter(c => c && c.owner === ownerId).length;
        return { score, newBoard };
    },

    computeBestMove: function() {
        const state = window.gameState;
        const board = state.board;
        const myHand = state.p1Hand;
        const opHand = state.p2Hand; // Cheating: Peeking CPU hand
        const avail = board.map((c, i) => c === null ? i : -1).filter(i => i !== -1);

        if (avail.length === 0) return null;

        let bestMove = null;
        let bestNetScore = -Infinity; // We want to maximize (MyFinalScore - OpFinalScore)

        // Heuristic: If we are winning big, play safe. If losing, play risky.
        // Actually, just maximize My Count at the end of the game is equivalent to maximizing difference since total cards is fixed (9).
        // Except hands are not on board yet.

        // For Depth 2 (Me -> Opponent), we look at result after Opponent's best reply.

        for (let h = 0; h < myHand.length; h++) {
            const card = myHand[h];
            for (let c = 0; c < avail.length; c++) {
                const cellIdx = avail[c];

                // 1. Simulate My Move
                const result1 = this.simulate(board, card, cellIdx, 1);

                // 2. Simulate Opponent's Best Reply
                const nextAvail = avail.filter(x => x !== cellIdx);
                let maxOpScore = -Infinity; // Worst case for me (Opponent maximizes their score)

                if (nextAvail.length === 0) {
                    // End of game or at least board full?
                    // If board is full, game over.
                    // Score is final.
                    if (result1.score > bestNetScore) {
                        bestNetScore = result1.score;
                        bestMove = { handIdx: h, cellIdx: cellIdx };
                    }
                    continue;
                }

                // We assume Opponent plays optimally from their hand.
                // We check all Opponent cards vs all remaining spots.
                // Note: Opponent has one less card after I move? No, they have their full hand until they play.
                // Wait, turn based. I play, then CPU plays.
                // So CPU hand is `opHand`.

                // Optimization: If too many branches, maybe sample?
                // But 5x8 = 40 checks is cheap.

                for (let oh = 0; oh < opHand.length; oh++) {
                    const opCard = opHand[oh];
                    for (let oc = 0; oc < nextAvail.length; oc++) {
                        const opCell = nextAvail[oc];
                        const result2 = this.simulate(result1.newBoard, opCard, opCell, 2);
                        if (result2.score > maxOpScore) {
                            maxOpScore = result2.score;
                        }
                    }
                }

                // My score after opponent moves would be roughly (TotalCardsOnBoard - maxOpScore)
                // Total cards on board after 2 moves = (Existing + 1 + 1).
                // But `result2.score` is P2 count.
                // We want to Minimize P2 count.
                // So we Maximize (-P2 count).

                // However, we also care about My Count.
                // Let's maximize (My Count - Opp Count).
                // Or simply Minimize Opp Count.
                // Let's use Minimize Opp Count.

                if (-maxOpScore > bestNetScore) {
                    bestNetScore = -maxOpScore;
                    bestMove = { handIdx: h, cellIdx: cellIdx };
                }
                // Tie-breaker: Maximize my immediate score if predicted outcomes are equal?
                else if (-maxOpScore === bestNetScore) {
                    // Prefer move that gives better immediate score?
                    if (result1.score > (bestMove ? -1 : -2)) { // Placeholder
                         // Maybe random or keep first found.
                    }
                }
            }
        }

        return bestMove || { handIdx: 0, cellIdx: avail[0] };
    }
};
"""

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate
        await page.goto("http://localhost:8000/triple-triad.html")
        await page.wait_for_load_state("networkidle")

        # Click Start
        await page.click("#start-btn")

        max_games = 50
        wins_needed = 5

        print("Starting game loop...")

        for game_num in range(1, max_games + 1):
            # Wait for turn
            while True:
                # Check for Game Over
                is_game_over = await page.evaluate("window.gameState.isGameOver")
                if is_game_over:
                    break

                is_player_turn = await page.evaluate("window.gameState.isPlayerTurn")
                if is_player_turn:
                    # Inject/Update AI logic
                    await page.evaluate(SMART_AI_JS)

                    # Compute Best Move
                    move = await page.evaluate("window.smartAI.computeBestMove()")

                    if move:
                        # handIdx matches data-idx in DOM because updateHandUI assigns them sequentially
                        print(f"Game {game_num}: Playing Hand {move['handIdx']} to Cell {move['cellIdx']}")

                        # Wait for locator to be visible
                        # Use a more robust selector if possible.
                        # data-idx is what the click handler uses.
                        card_locator = page.locator(f"#hand-p1 .hand-card[data-idx='{move['handIdx']}']")

                        # Sometimes locator might be stale?
                        # Or maybe we need to wait for turn to be REALLY active.
                        # Just in case, try catch or wait.
                        try:
                            await card_locator.wait_for(state="visible", timeout=5000)
                            await card_locator.click()
                        except Exception as e:
                            print(f"Error clicking card: {e}")
                            # Fallback: maybe the UI updated and handIdx is out of bounds?
                            # Re-eval
                            continue

                        # Click Cell
                        cell_locator = page.locator(f"#game-board .cell[data-idx='{move['cellIdx']}']")
                        await cell_locator.wait_for(state="visible", timeout=5000)
                        await cell_locator.click()

                        # Wait a bit for animation
                        await page.wait_for_timeout(1500)
                    else:
                        print("No move found?!")
                        break
                else:
                    await page.wait_for_timeout(500)

            # Game Over
            # Check Result
            p1_score = int(await page.locator("#score-p1").inner_text())
            p2_score = int(await page.locator("#score-p2").inner_text())
            streak = await page.evaluate("window.gameState.streak")

            result = "DRAW"
            if p1_score > p2_score: result = "WIN"
            elif p1_score < p2_score: result = "LOSE"

            print(f"Game {game_num} Finished: {result} ({p1_score}-{p2_score}). Streak: {streak}")

            if streak >= wins_needed:
                print(f"SUCCESS! Reached {wins_needed} wins in a row.")
                # Wait for modal to be fully visible
                await page.wait_for_selector("#result-modal:not(.hidden)")
                await page.screenshot(path="5_wins.png")
                break

            # Click Rematch
            await page.click("#restart-btn")
            await page.wait_for_timeout(1000)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
