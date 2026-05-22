"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#ebebeb" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            padding: "4rem 1rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              height: "4rem",
              width: "4rem",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "2px",
              border: "1px solid rgba(185,28,28,0.3)",
              background: "rgba(185,28,28,0.1)",
            }}
          >
            <AlertTriangle style={{ width: "2rem", height: "2rem", color: "#b91c1c" }} />
          </div>
          <div>
            <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 700, color: "#242424" }}>
              Error crítico de la aplicación
            </h1>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#575757", maxWidth: "28rem" }}>
              Ocurrió un error crítico. Por favor recarga la página.
            </p>
            {error.digest && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", fontFamily: "monospace", color: "#575757" }}>
                Código: {error.digest}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "2px",
              border: "1px solid #ccc",
              background: "#fff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <RotateCcw style={{ width: "1rem", height: "1rem" }} />
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
