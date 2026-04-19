import {Stack} from "expo-router";
import "../global.css";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query";
import {ClerkProvider} from "@clerk/clerk-expo";
import {tokenCache} from "@clerk/clerk-expo/token-cache";
import * as Sentry from "@sentry/react-native";
import {usePaystackDeepLink} from "@/lib/deeplink";
import {PaymentProvider} from "@/context/PaymentContext";

// Sentry.init({
//   dsn: "https://fb6731b90610cc08333e6c16ffac5724@o4509813037137920.ingest.de.sentry.io/4510451611205712",

//   // Adds more context data to events (IP address, cookies, user, etc.)
//   // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
//   sendDefaultPii: true,

//   // Enable Logs
//   enableLogs: true,

//   // Configure Session Replay
//   replaysSessionSampleRate: 1.0,
//   replaysOnErrorSampleRate: 1,
//   integrations: [Sentry.mobileReplayIntegration()]

//   // uncomment the line below to enable Spotlight (https://spotlightjs.com)
//   // spotlight: __DEV__,
// });

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any, query) => {}
  }),
  mutationCache: new MutationCache({
    onError: (error: any) => {}
  })
});

export default Sentry.wrap(function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <PaymentProvider>
          <AppContent />
        </PaymentProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
});

function AppContent() {
  usePaystackDeepLink();

  return <Stack screenOptions={{headerShown: false}} />;
}
// import {Stack} from "expo-router";

// export default function RootLayout() {
//   return <Stack />;
// }
