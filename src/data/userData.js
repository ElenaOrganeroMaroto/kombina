// Simulación de base de datos en memoria para usuarios
let users = [];

const getUsers = () => users;

const addUser = (user) => {
  users.push(user);
  return user;
};

const findUserByEmail = (email) => {
  return users.find(u => u.email === email);
};

const deleteUser = (email) => {
  const index = users.findIndex(u => u.email === email);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
  return null;
};

const clearUsers = () => {
  users = [];
};

module.exports = { getUsers, addUser, findUserByEmail, deleteUser, clearUsers };