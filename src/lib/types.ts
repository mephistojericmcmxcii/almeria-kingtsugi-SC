export type User = {
  id: string;
  displayName: string;
  email: string;
  role: 'admin' | 'guest';
  profileImageUrl: string;
};
