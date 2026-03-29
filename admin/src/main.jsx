import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

import {ClerkProvider} from "@clerk/clerk-react";
import {BrowserRouter} from "react-router";
import * as Sentry from "@sentry/react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

console.log(PUBLISHABLE_KEY);
const queryClient = new QueryClient();

// Sentry.init({
//   dsn: import.meta.env.VITE_SENTRY_DSN,
//   sendDefaultPii: true,
//   enableLogs: true,
//   integrations: [Sentry.replayIntegration()],
//   replaysSessionSampleRate: 1.0,
//   replaysOnErrorSampleRate: 1.0
// });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ClerkProvider>
    </BrowserRouter>
  </React.StrictMode>
);
