import HuntersPath from "./components/game/HuntersPath";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <HuntersPath />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
