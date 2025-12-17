export interface User {
  id: number;
  name: string;
  phone: string;
  status: 'pending' | 'checked-in';
  checkInTime?: string;
}

export interface Stats {
  total: number;
  checkedIn: number;
  pending: number;
  percentage: number;
}