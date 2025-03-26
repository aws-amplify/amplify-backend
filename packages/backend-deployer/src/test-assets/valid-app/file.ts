type User = {
  id: number;
  name: string;
  email: string;
  age?: number;
};
const user: User = {
  id: 1,
  name: 'User1',
  email: 'user1@example.com',
  age: 25,
};
const user2: User = {
  id: 2,
  name: 'User2',
  email: 'user2@example.com',
};
const users: User[] = [user, user2];
console.log(users);
