export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  role: 'user' | 'admin' | 'approver';
  avatar?: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface UserSession {
  user: User;
  token: string;
  expiresAt: Date;
}