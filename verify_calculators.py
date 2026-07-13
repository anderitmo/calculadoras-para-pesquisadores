import sys
from playwright.sync_api import sync_playwright

def run_cuj(page):
    # Navigate to home
    page.goto("http://localhost:8000/index.html")
    page.wait_for_timeout(500)

    # Assert header and title
    title = page.title()
    print(f"Loaded Home Page: {title}")

    # Take a screenshot of the home page
    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    print("Screenshot saved to /home/jules/verification/screenshots/verification.png")

    # Go to media geometrica and harmonica
    page.goto("http://localhost:8000/media-geometrica-harmonica.html")
    page.wait_for_timeout(500)
    print(f"Loaded page: {page.title()}")

    # Fill in some values
    page.get_by_role("button", name="Calcular").click()
    page.wait_for_timeout(500)

    # Check results
    results_text = page.locator("#resultado").inner_text()
    print("Results on media-geometrica-harmonica:")
    print(results_text)

    # Let's take a screenshot of the media-geometrica-harmonica results
    page.screenshot(path="/home/jules/verification/screenshots/geom_harm.png")

    # Let's go to Teste de Normalidade (Kolmogorov-Smirnov)
    page.goto("http://localhost:8000/teste-normalidade.html")
    page.wait_for_timeout(500)
    print(f"Loaded page: {page.title()}")
    page.get_by_role("button", name="Calcular").click()
    page.wait_for_timeout(500)
    print("Results on teste-normalidade:")
    print(page.locator("#resultado").inner_text()[:300])

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
