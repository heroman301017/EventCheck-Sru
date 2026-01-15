
export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
  isActive?: boolean; // New field for visibility control
}

export interface SystemSettings {
  isRegistrationOpen: boolean;
  isScanningOpen: boolean;
  allowPublicDashboard: boolean;
  ownerCredit?: string;
  themeColor?: string; // Hex color code for system theme
  scannerBackground?: string; // Base64 string or URL for scanner background image
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
  location?: string; // Format: "lat,lng"
  device?: string;
}

export interface Stats {
  total: number;
  checkedIn: number;
  present: number;
  returned: number;
  pending: number;
  percentage: number;
}
