import React from "react";
import { Switch, Route, Redirect } from "wouter";
import Dashboard from "@/pages/Dashboard";
import Alocacao from "@/pages/Alocacao";
import Conflitos from "@/pages/Conflitos";
import Disciplinas from "@/pages/Disciplinas";
import Horarios from "@/pages/Horarios";
import Exportar from "@/pages/Exportar";
import GradeCompleta from "@/pages/GradeCompleta";
import ArquivoAnual from "@/pages/ArquivoAnual";
import AuthPage from "@/pages/AuthPage";
import Professores from "@/pages/Professores";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/alocacao" component={Alocacao} />
      <Route path="/conflitos" component={Conflitos} />
      <Route path="/disciplinas" component={Disciplinas} />
      <Route path="/horarios" component={Horarios} />
      <Route path="/exportar" component={Exportar} />
      <Route path="/grade-completa" component={GradeCompleta} />
      <Route path="/arquivo-anual" component={ArquivoAnual} />
      <Route path="/professores" component={Professores} />
      <Route><Redirect to="/" /></Route>
    </Switch>
  );
}
