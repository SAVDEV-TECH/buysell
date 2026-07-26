import { test, expect } from "@playwright/test";

test.describe("Authentication Flows", () => {
  test("should render login page with Google OAuth button", async ({ page }) => {
    await page.goto("/login");

    // Check title and branding heading
    await expect(page).toHaveTitle(/buy/i);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    // Check email and password fields exist by ID
    const emailInput = page.locator("#login-email");
    const passwordInput = page.locator("#login-password");
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Check Google OAuth button exists
    const googleButton = page.locator("#google-login-btn");
    await expect(googleButton).toBeVisible();
  });

  test("should show error on invalid login credentials", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#login-email").fill("invalid_user@example.com");
    await page.locator("#login-password").fill("WrongPassword123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Verify error message is rendered
    const errorMessage = page.locator("text=/incorrect|failed|invalid/i");
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test("should render registration page with form fields", async ({ page }) => {
    await page.goto("/register");
    
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await expect(page.locator("#register-name")).toBeVisible();
    await expect(page.locator("#register-email")).toBeVisible();
    await expect(page.locator("#register-password")).toBeVisible();
  });
});
