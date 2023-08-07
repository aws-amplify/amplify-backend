import React, { useEffect, useState } from 'react';
import { Amplify, DataStore } from 'aws-amplify';
import {
  AmplifyProvider,
  Authenticator,
  Button,
  Heading,
  View,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import theme from './theme';
import { Todo } from './models';

import amplifyConfiguration from './amplifyconfiguration.json';

Amplify.configure(amplifyConfiguration);

const initialState = { name: '', description: '' };

function App() {
  const [formState, setFormState] = useState(initialState);
  const [todos, setTodos] = useState<Array<Todo>>([]);
  useEffect(() => {
    fetchTodos();
  }, []);

  function setInput(key, value) {
    setFormState({ ...formState, [key]: value });
  }

  async function fetchTodos() {
    try {
      const todos = await DataStore.query(Todo);
      setTodos(todos);
    } catch (err) {
      console.log('error fetching todos');
      console.log(err);
    }
  }

  async function addTodo() {
    try {
      if (!formState.name || !formState.description) return;
      const todo = { ...formState } as Todo;
      setTodos([...todos, todo]);
      setFormState(initialState);
      await DataStore.save(
        new Todo({
          ...todo,
        })
      );
    } catch (err) {
      console.log('error creating todo:', err);
    }
  }

  return (
    <AmplifyProvider theme={theme}>
      <Authenticator>
        {({ signOut, user }) => (
          <View width="100%">
            <div style={styles.container}>
              <Heading level={1}>Hello {user?.username}</Heading>
              <Button onClick={signOut} style={styles.button}>
                Sign out
              </Button>
              <h2>Amplify Todos</h2>
              <input
                onChange={(event) => setInput('name', event.target.value)}
                style={styles.input}
                value={formState.name}
                placeholder="Name"
              />
              <input
                onChange={(event) =>
                  setInput('description', event.target.value)
                }
                style={styles.input}
                value={formState.description}
                placeholder="Description"
              />
              <button style={styles.button} onClick={addTodo}>
                Create Todo
              </button>
              {todos.map((todo, index) => (
                <div key={todo.id ? todo.id : index} style={styles.todo}>
                  <p style={styles.todoName}>{todo.name}</p>
                  <p style={styles.todoDescription}>{todo.description}</p>
                </div>
              ))}
            </div>
          </View>
        )}
      </Authenticator>
    </AmplifyProvider>
  );
}

const styles = {
  container: {
    width: 400,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: 20,
  } as React.CSSProperties,
  todo: { marginBottom: 15 },
  input: {
    border: 'none',
    backgroundColor: '#ddd',
    marginBottom: 10,
    padding: 8,
    fontSize: 18,
  },
  todoName: { fontSize: 20, fontWeight: 'bold' },
  todoDescription: { marginBottom: 0 },
  button: {
    backgroundColor: 'black',
    color: 'white',
    outline: 'none',
    fontSize: 18,
    padding: '12px 0px',
  },
};

export default App;
