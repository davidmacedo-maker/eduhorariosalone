import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { useHashLocation } from "@/lib/hash-location";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Turmas from "@/pages/Turmas";
import Horarios from "@/pages/Horarios";
import Disciplinas from "@/pages/Disciplinas";
import Professores from "@/pages/Professores";
import Alocacao from "@/pages/Alocacao";
import Grade from "@/pages/Grade";
import GradeCompleta from "@/pages/GradeCompleta";
import Exportar from "@/pages/Exportar";
import ImportarArquivo from "@/pages/ImportarArquivo";
import ImportarBackup from "@/pages/ImportarBackup";
import Conflitos from "@/pages/Conflitos";
import HorariosGrade from "@/pages/HorariosGrade";
import LivroPonto from "@/pages/LivroPonto";
import ArquivoAnual from "@/pages/ArquivoAnual";
import ImportadorCSV from "@/pages/ImportadorCSV";
import AuthPage from "@/pages/AuthPage";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  if (supabase) {
    // Synchronous check: Supabase stores the session in localStorage
    const hasSession = Object.keys(localStorage).some(k => k.includes('-auth-token'));
    if (!hasSession) return <Redirect to="/login" />;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login">{() => <AuthPage mode="login" />}</Route>
      <Route path="/cadastro">{() => <AuthPage mode="cadastro" />}</Route>

      <Route>
        {() => (
          <Layout>
            <Switch>
              <Route path="/">{() => <ProtectedRoute component={Dashboard} />}</Route>
              <Route path="/turmas">{() => <ProtectedRoute component={Turmas} />}</Route>
              <Route path="/horarios">{() => <ProtectedRoute component={Horarios} />}</Route>
              <Route path="/disciplinas">{() => <ProtectedRoute component={Disciplinas} />}</Route>
              <Route path="/professores">{() => <ProtectedRoute component={Professores} />}</Route>
              <Route path="/alocacao">{() => <ProtectedRoute component={Alocacao} />}</Route>
              <Route path="/grade">{() => <ProtectedRoute component={Grade} />}</Route>
              <Route path="/grade-completa">{() => <ProtectedRoute component={GradeCompleta} />}</Route>
              <Route path="/exportar">{() => <ProtectedRoute component={Exportar} />}</Route>
              <Route path="/importar">{() => <ProtectedRoute component={ImportarArquivo} />}</Route>
              <Route path="/importar-backup">{() => <ProtectedRoute component={ImportarBackup} />}</Route>
              <Route path="/conflitos">{() => <ProtectedRoute component={Conflitos} />}</Route>
              <Route path="/horario">{() => <ProtectedRoute component={HorariosGrade} />}</Route>
              <Route path="/livro-ponto">{() => <ProtectedRoute component={LivroPonto} />}</Route>
              <Route path="/arquivo-anual">{() => <ProtectedRoute component={ArquivoAnual} />}</Route>
              <Route path="/importador-csv">{() => <ProtectedRoute component={ImportadorCSV} />}</Route>
              <Route>{() => <Redirect to="/" />}</Route>
            </Switch>
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter hook={useHashLocation}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
