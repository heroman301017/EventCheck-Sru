
export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
}

export interface SystemSettings {
  isRegistrationOpen: boolean;
  isScanningOpen: boolean;
  allowPublicDashboard: boolean;
  ownerCredit?: string;
}

export interface User {
  id: number;
  studentId: string;
  name: string;
  phone: string;
  faculty: string;
  major: string;
  eventId: string;
  status: 'pending' | 'checked-in' | 'checked-out';
  checkInTime?: string;
  checkOutTime?: string;
}

export interface Stats {
  total: number;
  checkedIn: number;
  present: number;
  returned: number;
  pending: number;
  percentage: number;
}
