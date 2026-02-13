"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@transformacion.app");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const router = useRouter();

  return <div className="space-y-6 pt-16"><h1 className="text-3xl font-bold">Transformación 2026</h1><p className="text-zinc-400">Login real para guardar progreso.</p><form className="card space-y-3" onSubmit={async (e) => { e.preventDefault(); const res = await fetch('/api/login', { method:'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }); if (!res.ok) setError('Credenciales inválidas'); else router.push('/today'); }}><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} /><input className="input" value={password} type="password" onChange={(e) => setPassword(e.target.value)} />{error && <p className="text-rose-400 text-sm">{error}</p>}<button className="btn w-full">Entrar</button></form></div>;
}
