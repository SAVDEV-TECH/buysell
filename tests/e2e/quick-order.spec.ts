import { test, expect } from "@playwright/test";

test.describe("Bulk Quick-Order & CSV Importer Pad", () => {
  test("should render quick order grid or login redirect", async ({ page }) => {
    await page.goto("/dashboard/quick-order");

    // Route requires auth; expect redirect to /login or rendering of quick order
    if (page.url().includes("/login")) {
      await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { name: /bulk quick-order/i })).toBeVisible();
    }
  });
});
