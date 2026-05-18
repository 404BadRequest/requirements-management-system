import { describe, expect, it } from "vitest";
import { roleHasPermission } from "@/lib/auth/permissions";

describe("roleHasPermission", () => {
  it("otorga a Admin acceso total a settings", () => {
    expect(roleHasPermission("Admin", "settings.delete")).toBe(true);
  });

  it("deniega a Viewer escritura en requerimientos", () => {
    expect(roleHasPermission("Viewer", "requirements.write")).toBe(false);
  });

  it("permite a Contributor exportar CSV", () => {
    expect(roleHasPermission("Contributor", "exports.run")).toBe(true);
  });

  it("deniega a Contributor borrar requerimientos", () => {
    expect(roleHasPermission("Contributor", "requirements.delete")).toBe(false);
  });
});
