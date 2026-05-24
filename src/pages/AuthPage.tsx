import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthPageProps {
  mode?: 'login' | 'cadastro';
}

export default function AuthPage({ mode = 'login' }: AuthPageProps) {
  const [, setLocation] = useLocation();
  const [isRegistering, setIsRegistering] = useState(mode === 'cadastro');
  const [loading, setLoading] = useState(false);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { toast.error('Configure o Supabase para usar o login.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Login realizado com sucesso!');
      setLocation('/');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer login. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { toast.error('Configure o Supabase para criar contas.'); return; }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('perfis_usuarios')
          .insert([{ id: authData.user.id, nome_completo: fullName, nome_usuario: username }]);
        if (profileError) throw profileError;
      }
      toast.success('Cadastro realizado! Faça o login agora.');
      setLocation('/login');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!supabase) { toast.error('Configure o Supabase primeiro.'); return; }
    if (!email) { toast.error('Insira o e-mail para recuperação.'); return; }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success('E-mail de recuperação enviado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar e-mail.');
    }
  };

  const inputCls = "mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm";
  const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">

        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl font-extrabold text-white">E</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">EduHorários</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isRegistering ? 'Crie a sua conta para gerir horários' : 'Faça login para aceder ao sistema'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 gap-1">
          <button
            type="button"
            onClick={() => { setIsRegistering(false); setLocation('/login'); }}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
              !isRegistering
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setIsRegistering(true); setLocation('/cadastro'); }}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
              isRegistering
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {!supabase && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-md px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
            <strong>Autenticação não configurada.</strong> Para activar, adicione <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">VITE_SUPABASE_URL</code> e <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> nos Secrets.
          </div>
        )}

        <form className="space-y-4" onSubmit={isRegistering ? handleRegister : handleLogin}>
          {isRegistering && (
            <>
              <div>
                <label className={labelCls}>Nome Completo</label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  className={inputCls} placeholder="Prof. João Silva" />
              </div>
              <div>
                <label className={labelCls}>Nome de Utilizador</label>
                <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                  className={inputCls} placeholder="joaosilva12" />
              </div>
            </>
          )}

          <div>
            <label className={labelCls}>E-mail</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className={inputCls} placeholder="seuemail@escola.edu.br" />
          </div>

          <div>
            <label className={labelCls}>Senha</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              className={inputCls} placeholder="••••••••" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 rounded-md shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading
              ? 'Processando...'
              : isRegistering
                ? 'Criar Conta'
                : 'Entrar no Sistema'}
          </button>
        </form>

        {!isRegistering && (
          <div className="text-center">
            <button type="button" onClick={handleForgotPassword}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              Esqueci a senha
            </button>
          </div>
        )}

        <div className="text-center">
          <button type="button" onClick={() => setLocation('/')}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            ← Voltar ao sistema
          </button>
        </div>

      </div>
    </div>
  );
}
