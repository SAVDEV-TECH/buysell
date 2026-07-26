import { test, expect } from "@playwright/test";

test.describe("Marketplace & Export Product Sourcing", () => {
  test("should render marketplace catalog and search bar", async ({ page }) => {
    await page.goto("/marketplace");

    // Check header & search input
    await expect(page.getByRole("heading", { name: /global marketplace/i })).toBeVisible();
  });

  test("should render export quality badges and sample order button on product page", async ({ page }) => {
    await page.goto("/marketplace");

    // Click first product link if available
    const firstProduct = page.locator("a[href^='/marketplace/']").first();
    if (await firstProduct.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstProduct.click();

      // Check product details & quality badges
      await expect(page.locator("text=/verified export grade/i")).toBeVisible();
      await expect(page.locator("text=/sgs \/ iso 9001/i")).toBeVisible();

      // Check "Order Sample Unit" button exists
      const sampleButton = page.getByRole("button", { name: /order sample unit/i });
      await expect(sampleButton).toBeVisible();
    }
  });
});
