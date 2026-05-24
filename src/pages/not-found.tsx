import { Link } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center gap-4">
      <AlertCircle className="w-14 h-14 text-muted-foreground/40" />
      <h1 className="text-3xl font-bold text-foreground">Página não encontrada</h1>
      <p className="text-muted-foreground max-w-xs">
        A página que você tentou acessar não existe ou foi movida.
      </p>
      <Link href="/">
        <Button variant="outline" className="mt-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Dashboard
        </Button>
      </Link>
    </div>
  );
}
