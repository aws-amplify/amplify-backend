import React, { useEffect, useState } from 'react';
import './App.css';
import awsExports from './aws-exports';
import { Amplify, Storage } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

function App() {
  useEffect(() => {
    Amplify.configure({
      Auth: {
        region: awsExports.REGION,
        userPoolId: awsExports.USER_POOL_ID,
        userPoolWebClientId: awsExports.USER_POOL_APP_CLIENT_ID,
        mandatorySignIn: false,
        identityPoolId: awsExports.IDENTITY_POOL_ID,
      },
      Storage: {
        bucket: 'super-cool-bucket',
        region: 'us-east-1',
      },
    });
  }, []);
  return (
    <Authenticator>
      {({ signOut, user }) => <HomePage signOut={signOut} user={user} />}
    </Authenticator>
  );
}

function HomePage({ signOut, user }: { signOut: any; user: any }) {
  const [files, setFiles] = useState<(string | undefined)[]>([]);
  useEffect(() => {
    Storage.list('accessLogs/', {
      bucket: 'super-cool-bucket',
      customPrefix: {
        public: '',
      },
      pageSize: 1000,
    })
      .then(({ results }) => setFiles(results.map((r) => r.key)))
      .catch((err) => console.log(err));
  }, []);
  return (
    <div>
      <p>Welcome {user?.username}</p>
      <button onClick={signOut}>Sign out</button>
      <table>
        <tbody>
          {files.map((f) => {
            return (
              <tr key={f}>
                <td>{f}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
