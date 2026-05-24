import { Switch, Route, Router as WouterRouter } from "wouter";
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
import Exportar from "@/pages/Exportar";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/turmas" component={Turmas} />
        <Route path="/horarios" component={Horarios} />
        <Route path="/disciplinas" component={Disciplinas} />
        <Route path="/professores" component={Professores} />
        <Route path="/alocacao" component={Alocacao} />
        <Route path="/grade" component={Grade} />
        <Route path="/exportar" component={Exportar} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base="">
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
