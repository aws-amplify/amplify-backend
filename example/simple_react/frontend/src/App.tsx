import React from 'react';
import { useEffect, useState } from 'react';
import './App.css';
import { schema } from '../../backend/schema';
import { inferModelType } from 'type-beast';

type Todo = inferModelType<typeof schema.client.models.Todo>;

function App() {
  const [todos, setTodos] = useState([]);
  const [name, setName] = useState('Todo Name');
  const [owner, setOwner] = useState('Owner');

  useEffect(() => {
    fetchTodos();
  }, []);

  async function fetchTodos() {
    const todos = await schema.client.models.Todo.list();
    setTodos(todos);
  }

  function create() {
    schema.client.models.Todo.create({ name, owner, done: false });
  }

  function update(todo: Todo) {
    schema.client.models.Todo.update(todo);
  }

  function deleteTodo(identifier: string) {
    schema.client.models.Todo.delete(identifier);
  }

  useEffect(() => {
    const subscription = schema.client.models.Todo.observeQuery({
      initialItems: [],
    }).subscribe(({ items }) => {
      console.log('observeQuery', items);
      setTodos(items);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div>
      <h1>Todo App</h1>
      <h3>New Todo</h3>
      <input
        type="text"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
        }}
      />
      Name
      <br />
      <input
        type="text"
        value={owner}
        onChange={(event) => {
          setOwner(event.target.value);
        }}
      />
      Owner
      <br />
      <button onClick={create}>Create</button>
      <br />
      <hr />
      <TodosList todos={todos} onUpdate={update} onDelete={deleteTodo} />
      <hr />
      <input
        type="button"
        value="List"
        onClick={async () => {
          console.log(await schema.client.models.Todo.list());
        }}
      />
      <CodeOutput name="Todos" code={todos} />
    </div>
  );
}

export default App;
