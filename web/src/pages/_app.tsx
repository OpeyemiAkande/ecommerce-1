import type {AppProps} from "next/app";
import "../app/globals.css";

// Only used by pages-router pages (the custom 500); it loads the same design
// tokens as the App Router layout.
export default function App({Component, pageProps}: AppProps) {
  return <Component {...pageProps} />;
}
