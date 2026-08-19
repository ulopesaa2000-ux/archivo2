// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\create-note.spec.ts
// 1. Visit the landing page ("/")
// 2. Click the login button and sign in
// 3. Arrive at the admin dashboard
// 4. Navigate to the Inventario section
// 5. Open the "Crear Nota" page, fill the form and submit
// 6. Verify the newly created note appears in the list
// 7. Check the stock information for a product
//
// The test runs in a mobile viewport (iPhone 12) to mimic a tutorial on a mobile device.
// Playwright's built‑in video recording is enabled via the project configuration (see playwright.config.ts).
import { test, expect, Page, Locator } from "@playwright/test";
// Use credentials from environment variables for security.
const USER_EMAIL = process.env.TEST_USER_EMAIL ?? "test@example.com";
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? "password123";
// Helper to wait for navigation after a click that triggers a route change.
async function clickAndWait(page: Page, selectorOrLocator: string | Locator) {
    if (typeof selectorOrLocator === "string") {
        await Promise.all([
            page.waitForNavigation({ waitUntil: "networkidle" }),
            page.click(selectorOrLocator),
        ]);
    } else {
        await Promise.all([
            page.waitForNavigation({ waitUntil: "networkidle" }),
            selectorOrLocator.click(),
        ]);
    }
}

test.use({
    // Emulate an iPhone 12 device.
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    // Record a video for the whole test.
    video: "retain-on-failure",
});

test.describe("Crear nota y ver stock (mobile)", () => {
    test("login → dashboard → inventario → crear nota → validar", async ({ page }) => {
        // 1. Open the site root.
        await page.goto("http://localhost:3000/");
        // 2. Navigate to the login page (the landing page usually has a "Iniciar sesión" button).
        await clickAndWait(page, "text=Iniciar sesión");
        // 3. Fill login form.
        await expect(page.locator("input[name='email']")).toBeVisible();
        await page.fill("input[name='email']", USER_EMAIL);
        await page.fill("input[name='password']", USER_PASSWORD);
        await clickAndWait(page, "button:has-text('Ingresar')");
        // 4. Verify we are on the admin dashboard.
        await expect(page).toHaveURL(/\/admin\/dashboard/);
        await expect(page.locator("h1", { hasText: /Dashboard/i })).toBeVisible();
        // 5. Open the Inventario section via the sidebar menu.
        await clickAndWait(page, "nav >> text=Inventario");
        await expect(page).toHaveURL(/\/admin\/inventario/);
        // 6. Go to the Notas sub‑section and click "Crear Nota".
        await clickAndWait(page, "nav >> text=Notas");
        await clickAndWait(page, "text=Crear Nota");
        await expect(page).toHaveURL(/\/admin\/inventario\/notas\/nueva/);
        // 7. Fill the note form. Adjust selectors to match your implementation.
        await page.fill("[name='producto']", "Camisa Algodón");
        await page.fill("[name='cantidad']", "5");
        await page.selectOption("[name='bodega']", { label: "Bodega Central" });
        // Add any additional required fields here.
        await clickAndWait(page, "button:has-text('Guardar')");
        // 8. After saving, the UI should redirect to the notes list.
        await expect(page).toHaveURL(/\/admin\/inventario\/notas/);
        const noteRow = page.locator("tr", { hasText: /Camisa Algodón/ });
        await expect(noteRow).toBeVisible();
        // 9. Open the product detail (or stock view) to check stock.
        await noteRow.locator("a", { hasText: /Ver Stock/ }).click();
await page.waitForNavigation({ waitUntil: "networkidle" });
        const stockValue = page.locator("[data-test-id='stock-quantity']");
        await expect(stockValue).toBeVisible();
        const stockText = await stockValue.textContent();
        const stockNumber = Number(stockText?.replace(/[^0-9]/g, ""));
        expect(stockNumber).toBeGreaterThanOrEqual(0);
    });
});
