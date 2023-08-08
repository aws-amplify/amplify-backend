import React from 'react';

const style = {
  card: {
    width: 400,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  } as React.CSSProperties,
  heading: {
    marginBottom: 15,
  },
  todoList: {
    marginBottom: 15,
  },
  todoCard: {
    position: 'relative',
  } as React.CSSProperties,
  removeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    fontSize: 25,
  } as React.CSSProperties,
  form: {
    marginTop: 50,
    textInput: {
      marginBottom: 20,
    },
  },
};

export default style;
