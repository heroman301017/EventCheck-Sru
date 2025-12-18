
import { User, Event } from './types';

export const normalizePhone = (phone: string) => {
  return phone
    .replace(/๐/g, '0').replace(/๑/g, '1').replace(/๒/g, '2').replace(/๓/g, '3').replace(/๔/g, '4')
    .replace(/๕/g, '5').replace(/๖/g, '6').replace(/๗/g, '7').replace(/๘/g, '8').replace(/๙/g, '9')
    .replace(/-/g, '').replace(/\s/g, '');
};

export const formatThaiDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch (e) {
    return dateStr;
  }
};

export const INITIAL_EVENTS: Event[] = [
  {
    id: 'e1',
    name: 'ปฐมนิเทศนักศึกษาใหม่ 2567',
    date: '2024-06-01',
    location: 'หอประชุมใหญ่',
    description: 'กิจกรรมต้อนรับนักศึกษาใหม่และแนะนำคณะ'
  }
];

export const INITIAL_USERS: User[] = [
  { 
    id: 1, 
    studentId: "64123456",
    name: "สมชาย ใจดี", 
    phone: "0812345678", 
    faculty: "วิทยาการจัดการ",
    major: "การจัดการธุรกิจ",
    eventId: "e1",
    status: "pending" 
  }
];
