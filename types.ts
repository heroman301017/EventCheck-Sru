export interface User {
  id: number;
  name: string;
  phone: string;
  status: 'pending' | 'checked-in' | 'checked-out';
  checkInTime?: string;
  checkOutTime?: string;
}

export interface Stats {
  total: number;
  checkedIn: number;   // Total Checked In (History) or Currently Present? Let's treat as "Attended" (In + Out)
  present: number;     // Currently Checked In (Not Out)
  returned: number;    // Checked Out
  pending: number;
  percentage: number;
}