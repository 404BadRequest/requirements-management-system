import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Evita que Turbopack infiera otro workspace por lockfiles en directorios padre. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /**
   * Orígenes permitidos para el servidor de desarrollo (HMR / cross-origin).
   * Incluye localhost y tu IP LAN si abres la app desde el móvil u otra máquina.
   */
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.0.40"],
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
