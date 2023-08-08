import React, { useEffect, useState } from 'react';
import { DataStore } from 'aws-amplify';
import {
  Heading,
  Button,
  Card,
  View,
  Flex,
  Text,
  Collection,
  Divider,
  TextField,
} from '@aws-amplify/ui-react';
import { BiTrash } from 'react-icons/bi';
import { Todo } from '../../models';
import style from './style';

const initialState = { name: '', description: '' };

function TodoView() {
  const [formState, setFormState] = useState(initialState);
  const [todos, setTodos] = useState<Array<Todo>>([]);
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const todos = await DataStore.query(Todo);
      setTodos(todos);
    } catch (error) {
      console.log('error fetching todos:', error);
    }
  };

  const setInput = (key, value) => {
    setFormState({ ...formState, [key]: value });
  };

  const addTodo = async () => {
    try {
      if (!formState.name || !formState.description) return;
      const todo = new Todo({ ...formState });
      await DataStore.save(todo);
      setTodos([...todos, todo]);
      setFormState(initialState);
    } catch (error) {
      console.log('error creating todo:', error);
    }
  };

  const removeTodo = async (id: string) => {
    try {
      const toDelete = await DataStore.query(Todo, id);
      if (toDelete) {
        await DataStore.delete(toDelete);
      }
      fetchTodos();
    } catch (error) {
      console.log('error removing todo:', error);
    }
  };

  return (
    <Card style={style.card}>
      <Heading level={1}>Todos</Heading>
      <Divider style={style.heading} />
      <Collection
        items={todos}
        type="list"
        style={style.todoList}
        searchNoResultsFound={
          <Flex justifyContent="center">
            <Text>No todos found.</Text>
          </Flex>
        }
      >
        {(item, index) => (
          <Card variation="elevated" key={item.id} style={style.todoCard}>
            <Heading level={4}>{item.name}</Heading>
            <p>{item.description}</p>
            <BiTrash
              style={style.removeButton}
              onClick={async () => removeTodo(item.id)}
              onMouseOver={console.log}
            />
          </Card>
        )}
      </Collection>
      <View style={style.form}>
        <TextField
          labelHidden
          label="Name"
          placeholder="Name"
          style={style.form.textInput}
          value={formState.name}
          onChange={(event) => setInput('name', event.target.value)}
        />
        <TextField
          labelHidden
          label="Description"
          placeholder="Description"
          style={style.form.textInput}
          value={formState.description}
          onChange={(event) => setInput('description', event.target.value)}
        />
      </View>
      <Button variation="primary" onClick={addTodo}>
        Create Todo
      </Button>
    </Card>
  );
}

export default TodoView;
