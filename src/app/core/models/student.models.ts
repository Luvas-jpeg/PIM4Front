import { CourseClass } from './course.models';
import { Participation } from './enrollment.models';

export interface Student {
  enrollmentId?: number;
  participation?: Participation | null;
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

export interface TransferEnrollmentResponse {
  student: Student;
  sourceClass: CourseClass;
  targetClass: CourseClass;
}
