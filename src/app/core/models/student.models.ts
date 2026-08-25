export interface Student {
  id: number;
  name: string;
  email: string;
  phone: string;
  courseId: string;
  courseName: string;
  enrollmentDate: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface StudentRequest {
  name: string;
  email: string;
  phone: string;
  courseId: string;
  courseName: string;
  enrollmentDate: string;
  status: 'active' | 'completed' | 'cancelled';
}
