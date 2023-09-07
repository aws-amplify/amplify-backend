import React from 'react';
import { AmplifyProvider, Authenticator, View } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import theme from './theme';
import SignOut from './components/signOut';
import TodoCollection from './components/todos';
import amplifyConfiguration from './amplifyconfiguration.js';
import { TodoCreateForm } from './ui-components';

Amplify.configure(amplifyConfiguration);

function App() {
  return (
    <AmplifyProvider theme={theme}>
      <Authenticator>
        {({ signOut, user }) => (
          <View>
            <SignOut user={user} signOut={signOut} />
            <TodoCreateForm />
            <TodoCollection />
          </View>
        )}
      </Authenticator>
    </AmplifyProvider>
  );
}

export default App;
