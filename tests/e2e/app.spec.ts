import { expect, test } from "@playwright/test";

test("ver dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Dashboard general")).toBeVisible();
});

test("dashboard respeta clientId en la URL", async ({ page }) => {
  await page.goto("/dashboard?clientId=client-esval");
  await expect(page.locator("#client-filter")).toHaveValue("client-esval");
});

test("crear requerimiento", async ({ page }) => {
  await page.goto("/requirements");
  await page.getByRole("button", { name: "Nuevo requerimiento" }).click();
  await expect(page.getByRole("dialog", { name: "Nuevo requerimiento" })).toBeVisible();
  await page.getByLabel("Titulo").fill("Req e2e");
  await page.getByLabel("Descripcion").fill("Detalle e2e");
  await page.getByRole("button", { name: "Guardar requerimiento" }).click();
  await expect(page.getByText("Req e2e")).toBeVisible();
});


test("navegar configuración: perfiles y usuarios", async ({ page }) => {
  await page.goto("/settings/profiles");
  await expect(page.getByRole("heading", { level: 2, name: "Perfiles y tarifas" })).toBeVisible();
  await page.getByRole("link", { name: "Usuarios", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/users$/);
  await expect(page.getByRole("heading", { level: 2, name: "Usuarios" })).toBeVisible();
});

test("mensaje settingsError visible en configuración", async ({ page }) => {
  const msg = "Mensaje de prueba configuración";
  await page.goto(`/settings/clients?settingsError=${encodeURIComponent(msg)}`);
  await expect(page.getByRole("alert")).toContainText(msg);
});

test("pestaña clientes accesible", async ({ page }) => {
  await page.goto("/settings/clients");
  await expect(page.getByRole("heading", { level: 2, name: "Clientes" })).toBeVisible();
});
