import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";
import MastersPage from "@/pages/masters/MastersPage";
import CsoPage from "@/pages/cso/CsoPage";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={CsoPage} />
        <Route path="/cso" component={CsoPage} />
        <Route path="/masters" component={MastersPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
