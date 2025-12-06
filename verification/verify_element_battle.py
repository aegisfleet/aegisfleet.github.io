import asyncio
from playwright.async_api import async_playwright
import time

async def verify_element_battle():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        await page.goto("http://localhost:8000/element-sequence-battle.html")

        # Start game
        await page.click("#start-button")

        # Play one stage
        while True:
            state = await page.evaluate("() => window.getGameState ? window.getGameState() : null")
            if not state:
                await asyncio.sleep(0.1)
                continue

            # If stage > 1, we won stage 1.
            if state["currentStage"] > 1:
                break

            # Check for stage clear message BEFORE currentStage updates (it updates in winStage but overlay appears later?)
            # Actually currentStage increments in winStage, then showMessage is called.

            if state["isPlayerTurn"]:
                sequence = state["currentSequence"]
                for element in sequence:
                    await page.click(f"#btn-{element}")
                    await asyncio.sleep(0.1)
                await page.wait_for_function("() => !window.getGameState().isPlayerTurn")

            await asyncio.sleep(0.1)

        # Wait for the message overlay to appear
        await page.wait_for_selector("#message-overlay.visible", state="visible")

        # Take screenshot
        await page.screenshot(path="/home/jules/verification/verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_element_battle())
