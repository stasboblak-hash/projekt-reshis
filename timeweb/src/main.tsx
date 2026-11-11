import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@fontsource/ibm-plex-sans/cyrillic-400.css";
import "@fontsource/ibm-plex-sans/cyrillic-500.css";
import "@fontsource/ibm-plex-sans/cyrillic-600.css";
import "@fontsource/ibm-plex-sans/cyrillic-700.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-sans/latin-700.css";
import "@fontsource/ibm-plex-mono/cyrillic-400.css";
import "@fontsource/ibm-plex-mono/cyrillic-500.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
