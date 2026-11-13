import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { ErrorNote, Field, Panel, PrimaryButton, controlClass } from "@/components/fleet/bits";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        // Registro
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0], // Usamos la parte antes del @ como nombre
        });
        if (error) throw new Error(error.message);
      } else {
        // Inicio de sesión
        const { error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error) throw new Error(error.message);
      }
      // Si todo sale bien, recargamos para que la app detecte la sesión
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al autenticar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <Panel className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-md bg-primary font-mono text-xl font-semibold text-primary-ink">
            L
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Leo</h1>
          <p className="text-sm text-muted">Control de transporte</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="Correo electrónico">
            <input
              type="email"
              className={controlClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
            />
          </Field>
          <Field label="Contraseña">
            <input
              type="password"
              className={controlClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>

          {error ? <ErrorNote>{error}</ErrorNote> : null}

          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Cargando..." : isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </PrimaryButton>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister
              ? "¿Ya tienes cuenta? Inicia sesión"
              : "¿No tienes cuenta? Regístrate aquí"}
          </button>
        </div>
      </Panel>
    </div>
  );
}