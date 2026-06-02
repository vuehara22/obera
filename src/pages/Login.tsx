import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Lock, Mail, LayoutGrid } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login({ email, password });

    if (!result.ok) {
      setError(result.error || "No se pudo iniciar sesión.");
      setLoading(false);
      return;
    }

    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <LayoutGrid className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Oberá Eventos
            </h1>
            <p className="text-sm text-slate-600">
              Ingresá para acceder al sistema
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Email
            </label>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tuemail@empresa.com"
                className="
                  w-full rounded-xl border border-slate-300 bg-white
                  pl-10 pr-3 py-3 text-sm text-slate-900 placeholder:text-slate-500
                  outline-none
                  focus:border-slate-400
                  focus:ring-2 focus:ring-slate-900/20
                "
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Contraseña
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="
                  w-full rounded-xl border border-slate-300 bg-white
                  pl-10 pr-3 py-3 text-sm text-slate-900 placeholder:text-slate-500
                  outline-none
                  focus:border-slate-400
                  focus:ring-2 focus:ring-slate-900/20
                "
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full rounded-xl bg-slate-900 px-4 py-3
              text-sm font-semibold text-white
              transition hover:bg-black
              disabled:cursor-not-allowed disabled:opacity-70
            "
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

      </div>
    </div>
  );
}