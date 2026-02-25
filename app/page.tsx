"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  deleteDoc,   
  doc          
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Registro = {
  id?: string;
  uid: string;
  dateISO: string; // yyyy-mm-dd
  month: string; // yyyy-mm
  faturamento: number;
  gastos: number;
  createdAt?: unknown;
};

const META = 12500;

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}
function mesAtual() {
  return new Date().toISOString().slice(0, 7);
}

export default function Home() {
  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erroAuth, setErroAuth] = useState("");

  // App
  const [month, setMonth] = useState(mesAtual());
  const [dateISO, setDateISO] = useState(hojeISO());
  const [faturamento, setFaturamento] = useState("");
  const [gastos, setGastos] = useState("");
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [salvando, setSalvando] = useState(false);
async function handleDelete(id: string) {
  const ok = confirm("Deseja excluir este registro?");
  if (!ok) return;

  await deleteDoc(doc(db, "registros", id));

  setRegistros((prev) => prev.filter((r) => r.id !== id));
}
  // Observa login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCarregando(false);
    });
    return () => unsub();
  }, []);

  // Carrega registros do mês
  useEffect(() => {
    if (!user) {
      setRegistros([]);
      return;
    }
    (async () => {
      const q = query(
        collection(db, "registros"),
        where("uid", "==", user.uid),
        where("month", "==", month),
        orderBy("dateISO", "desc")
      );
      const snap = await getDocs(q);
      const lista: Registro[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Registro),
      }));
      setRegistros(lista);
    })();
  }, [user, month]);

  const totalFaturado = useMemo(
    () => registros.reduce((acc, r) => acc + (r.faturamento || 0), 0),
    [registros]
  );
  const totalGasto = useMemo(
    () => registros.reduce((acc, r) => acc + (r.gastos || 0), 0),
    [registros]
  );
  const saldo = totalFaturado - totalGasto;
  const progresso = Math.min((totalFaturado / META) * 100, 100);

  async function entrar() {
    setErroAuth("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
    } catch (e: any) {
      setErroAuth(e?.message || "Erro ao entrar.");
    }
  }

  async function criarConta() {
    setErroAuth("");
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), senha);
    } catch (e: any) {
      setErroAuth(e?.message || "Erro ao criar conta.");
    }
  }

  async function sair() {
    await signOut(auth);
  }

  async function salvarRegistro() {
    if (!user) return;
    if (!faturamento && !gastos) return;

    setSalvando(true);
    try {
      await addDoc(collection(db, "registros"), {
        uid: user.uid,
        dateISO,
        month,
        faturamento: parseFloat(faturamento) || 0,
        gastos: parseFloat(gastos) || 0,
        createdAt: serverTimestamp(),
      } satisfies Registro);

      setFaturamento("");
      setGastos("");

      // Recarrega lista
      const q = query(
        collection(db, "registros"),
        where("uid", "==", user.uid),
        where("month", "==", month),
        orderBy("dateISO", "desc")
      );
      const snap = await getDocs(q);
      const lista: Registro[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Registro),
      }));
      setRegistros(lista);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <div className="p-8">Carregando…</div>;

  // Tela de login
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4">Central Financeira</h1>

          <input
            className="border p-2 rounded w-full mb-2"
            placeholder="Seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="border p-2 rounded w-full mb-3"
            placeholder="Sua senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          {erroAuth ? (
            <div className="text-sm text-red-600 mb-3 break-words">
              {erroAuth}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              onClick={entrar}
              className="bg-black text-white px-4 py-2 rounded w-full"
            >
              Entrar
            </button>
            <button
              onClick={criarConta}
              className="border px-4 py-2 rounded w-full"
            >
              Criar conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela logada
  return (
  <div className="min-h-screen bg-gray-100 p-6">
    {!user ? (
      <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-md">
        <h1 className="text-xl font-semibold mb-4">OrganizaAI</h1>

        <input
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="Senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={entrar}
            className="flex-1 bg-black text-white rounded px-3 py-2"
          >
            Entrar
          </button>
          <button
            onClick={criarConta}
            className="flex-1 bg-gray-200 rounded px-3 py-2"
          >
            Criar conta
          </button>
        </div>

        {erroAuth && <p className="text-red-600 mt-3">{erroAuth}</p>}
      </div>
    ) : (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Central Financeira</h1>
          <button
            onClick={sair}
            className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded"
          >
            Sair
          </button>
        </div>

        {/* Form */}
        <div className="bg-white p-6 rounded-2xl shadow-md mb-6">
          <h2 className="font-semibold mb-3">Novo registro</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="border rounded px-3 py-2"
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Mês (yyyy-mm)"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Faturamento"
              value={faturamento}
              onChange={(e) => setFaturamento(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Gastos"
              value={gastos}
              onChange={(e) => setGastos(e.target.value)}
            />
          </div>

          <button
            onClick={salvarRegistro}
            disabled={salvando}
            className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>

        {/* Resumo */}
        <div className="bg-white p-6 rounded-2xl shadow-md mb-6">
          <h2 className="font-semibold mb-3">Resumo</h2>
          <p>Total Faturado: R$ {totalFaturado.toFixed(2)}</p>
          <p>Total Gastos: R$ {totalGasto.toFixed(2)}</p>
          <p>Saldo: R$ {saldo.toFixed(2)}</p>
        </div>

        {/* Histórico */}
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <h2 className="font-semibold mb-3">Histórico do mês</h2>

          {registros.length === 0 ? (
            <p className="text-gray-600">Sem registros ainda.</p>
          ) : (
            <div className="grid gap-2">
              {registros.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap gap-3 justify-between border-b py-2 items-center"
                >
                  <span className="font-medium">{r.dateISO}</span>

                  <span className="text-green-600">
                    + R$ {Number(r.faturamento).toFixed(2)}
                  </span>

                  <span className="text-red-600">
                    - R$ {Number(r.gastos).toFixed(2)}
                  </span>

                  <button
                   onClick={() => handleDelete(r.id)}
                    className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);
}