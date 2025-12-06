import asyncio
from playwright.async_api import async_playwright
import time

async def solve_element_battle():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Load the page
        print("Loading page...")
        await page.goto("http://localhost:8000/element-sequence-battle.html")

        # Wait for the start screen and click Start
        print("Starting game...")
        await page.wait_for_selector("#start-button", state="visible")
        await page.click("#start-button")

        target_wins = 15
        # The game starts at Stage 1. We want to win 15 times, so we need to clear Stage 15.
        # After clearing Stage 15, currentStage will become 16.
        target_stage_after_wins = target_wins + 1

        start_time = time.time()

        while True:
            # Check for timeout (safety)
            if time.time() - start_time > 300: # 5 minutes max
                print("Timeout reached.")
                break

            # Poll for game state
            try:
                state = await page.evaluate("() => window.getGameState ? window.getGameState() : null")
            except Exception as e:
                # Page might be reloading or not ready
                await asyncio.sleep(0.1)
                continue

            if not state:
                await asyncio.sleep(0.1)
                continue

            current_stage = state["currentStage"]

            if current_stage >= target_stage_after_wins:
                print(f"SUCCESS: Reached Stage {current_stage}. Target of {target_wins} consecutive wins achieved.")
                break

            # Check for Message Overlay (Stage Clear / Game Over)
            is_message_visible = await page.evaluate("""() => {
                const overlay = document.getElementById('message-overlay');
                return overlay && overlay.classList.contains('visible');
            }""")

            if is_message_visible:
                # Check for OK button
                is_ok_visible = await page.is_visible("#message-ok-button")
                if is_ok_visible:
                    # print("Clicking OK button (Stage Clear)...")
                    await page.click("#message-ok-button")
                    await asyncio.sleep(0.5) # Wait for fade out
                    continue

                # Check for Game Over (Retry button which calls resetGame)
                # Actually resetGame creates start screen? No, resetGame calls initGame directly?
                # Let's check resetGame code.
                # resetGame calls initGame.
                # gameOver calls showMessage(..., 'リトライ', resetGame).
                # So if we see 'リトライ' or message-ok-button with text 'リトライ'...
                # Wait, showMessage sets messageOkButton text.

                # If we are in Game Over, something went wrong.
                msg_text = await page.inner_text("#message-text")
                if "GAME OVER" in msg_text:
                    print(f"FAILED: Game Over at Stage {current_stage}.")
                    break

            if state["isPlayerTurn"]:
                print(f"Stage {current_stage}: Player Turn. Inputting sequence...")
                sequence = state["currentSequence"]

                # Input sequence
                for element in sequence:
                    btn_id = f"#btn-{element}"
                    await page.click(btn_id)
                    # Very short delay
                    await asyncio.sleep(0.05)

                # Wait for turn to end to avoid double submission
                await page.wait_for_function("() => !window.getGameState().isPlayerTurn")

            await asyncio.sleep(0.1)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(solve_element_battle())
