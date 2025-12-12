export interface Contestant {
  id: string;
  number: string;
  name: string;
  department: string; // Added field
  imageUrl: string;
  votes: number;
}

export interface User {
  email: string;
  isAdmin: boolean;
  hasVoted: boolean;
  votedForId?: string;
}

export interface AppState {
  contestants: Contestant[];
  currentUser: User | null;
  bannerUrl: string;
  voteDeadline: string | null; // ISO string format
}