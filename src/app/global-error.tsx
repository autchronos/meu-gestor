"use client";

export default function ErroGlobal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F8FA", color: "#0A2540", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Algo deu errado</h1>
          <p style={{ fontSize: 14, color: "#5b6672", margin: "0 0 16px" }}>Recarregue a página para continuar.</p>
          <button onClick={reset} style={{ background: "#0A2540", color: "#fff", border: 0, padding: "8px 16px", textTransform: "uppercase", letterSpacing: 1, fontSize: 13, cursor: "pointer" }}>
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
