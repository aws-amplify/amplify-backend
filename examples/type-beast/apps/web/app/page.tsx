import Image from "next/image";
import styles from "./page.module.css";
import { ClientComponent } from "./client-component";
import { Amplify, withSSRContext } from "aws-amplify";

import { default as aswConfig } from "../src/aws-exports";
import { default as modelIntrospection } from "../src/model-introspection.json";
import type { Schema } from "../../backend/data";
import { headers } from "next/headers";

Amplify.configure({
  ...aswConfig,
  ssr: true,
  API: {
    modelIntrospection,
  },
});

export default async function Home() {
  const req = { headers: { cookie: headers().get("cookie") } };
  const SSR = withSSRContext({ req });

  const client = SSR.API.generateClient();

  const posts = await client.models.Post.list();

  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <ClientComponent />
      </div>
      <div className={styles.description}>
        <pre>SSR Prefetched Posts: {JSON.stringify(posts, undefined, 2)}</pre>
      </div>
    </main>
  );
}
