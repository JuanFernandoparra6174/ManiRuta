import { supabase } from "./supabaseClient.js";
import { getAuthSession, requestPasswordReset, signOut, updatePassword } from "./auth.js";
import { setError, setOk } from "./ui.js";

const RECOVERY_FLAG = "mr_password_recovery";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hasRecoveryParams() {
  const hash = window.location.hash || "";
  const search = window.location.search || "";

  return (
    hash.includes("type=recovery") ||
    hash.includes("recovery_token") ||
    search.includes("type=recovery") ||
    search.includes("token_hash=")
  );
}

function markRecoveryFlowActive() {
  sessionStorage.setItem(RECOVERY_FLAG, "1");
}

function clearRecoveryFlowFlag() {
  sessionStorage.removeItem(RECOVERY_FLAG);
}

function hasRecoveryFlowFlag() {
  return sessionStorage.getItem(RECOVERY_FLAG) === "1";
}

function setLoading(button, isLoading, loadingText, idleText) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : idleText;
  button.style.opacity = isLoading ? "0.75" : "1";
}

export function initForgotPasswordPage() {
  const form = document.getElementById("forgotPasswordForm");
  if (!form) return;

  const emailInput = document.getElementById("email");
  const submitBtn = document.getElementById("forgotSubmit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError("err", "");
    setOk("ok", "");

    const email = emailInput.value.trim().toLowerCase();
    if (!email) {
      setError("err", "Debes ingresar un correo.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("err", "Ingresa un correo valido.");
      return;
    }

    const redirectTo = new URL("update_password.html", window.location.href).href;

    try {
      setLoading(submitBtn, true, "Enviando...", "Enviar enlace");
      await requestPasswordReset({ email, redirectTo });
      setOk("ok", "Si el correo existe, te enviamos un enlace para restablecer la contrasena.");
      form.reset();
    } catch (err) {
      setError("err", err?.message || "No fue posible enviar el correo de recuperacion.");
    } finally {
      setLoading(submitBtn, false, "Enviando...", "Enviar enlace");
    }
  });
}

async function resolveRecoveryAccess() {
  if (hasRecoveryParams()) {
    markRecoveryFlowActive();
  }

  let session = await getAuthSession();
  if (session && (hasRecoveryParams() || hasRecoveryFlowFlag())) {
    return true;
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
  session = await getAuthSession();
  return Boolean(session && (hasRecoveryParams() || hasRecoveryFlowFlag()));
}

export function initUpdatePasswordPage() {
  const form = document.getElementById("updatePasswordForm");
  if (!form) return;

  const submitBtn = document.getElementById("updateSubmit");
  const stateBox = document.getElementById("state");
  const passwordInput = document.getElementById("password");
  const confirmInput = document.getElementById("confirm");

  const renderBlockedState = (message) => {
    if (stateBox) {
      stateBox.textContent = message;
      stateBox.style.display = "block";
    }
    form.style.display = "none";
  };

  const renderReadyState = () => {
    if (stateBox) stateBox.style.display = "none";
    form.style.display = "flex";
  };

  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      markRecoveryFlowActive();
      renderReadyState();
    }
  });

  (async () => {
    try {
      const allowed = await resolveRecoveryAccess();
      if (!allowed) {
        clearRecoveryFlowFlag();
        renderBlockedState("El enlace no es valido o ya expiro. Solicita uno nuevo desde el login.");
        return;
      }

      renderReadyState();
    } catch (err) {
      renderBlockedState(err?.message || "No fue posible validar el enlace de recuperacion.");
    }
  })();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError("err", "");
    setOk("ok", "");

    const password = passwordInput.value;
    const confirm = confirmInput.value;

    if (!password) {
      setError("err", "Debes ingresar una nueva contrasena.");
      return;
    }

    if (password.length < 8) {
      setError("err", "La nueva contrasena debe tener minimo 8 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("err", "Las contrasenas no coinciden.");
      return;
    }

    try {
      setLoading(submitBtn, true, "Actualizando...", "Actualizar contrasena");
      await updatePassword({ password });
      clearRecoveryFlowFlag();
      setOk("ok", "Contrasena actualizada correctamente. Te llevaremos al login.");
      passwordInput.value = "";
      confirmInput.value = "";

      await signOut().catch(() => {});
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 1600);
    } catch (err) {
      setError("err", err?.message || "No fue posible actualizar la contrasena.");
    } finally {
      setLoading(submitBtn, false, "Actualizando...", "Actualizar contrasena");
    }
  });
}
