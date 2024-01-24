import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Amplify } from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react';
import config from '../amplifyconfiguration.json';
import '@aws-amplify/ui-react/styles.css';
Amplify.configure(config);

function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default withAuthenticator(App);
