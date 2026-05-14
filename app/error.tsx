"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ padding: "64px 32px", textAlign: "center" }}>
      <h1 style={{ fontSize: 20, marginBottom: 12, color: "var(--text)" }}>
        Тимчасова помилка
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
        Не вдалося завантажити дані. Спробуйте пізніше.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "8px 20px",
          fontSize: 13,
          borderRadius: 8,
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        Спробувати знову
      </button>
    </main>
  );
}
