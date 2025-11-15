export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'guest';
  avatar: string;
};
