export function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? "";
}

export function setError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg ?? "";
  el.style.display = msg ? "block" : "none";
}
