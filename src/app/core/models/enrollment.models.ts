export interface MyEnrollment {
  enrollmentId: number;
  courseId: number;
  classId: number;
  orderId: number;
  courseName: string;
  courseDescription: string;
  courseImage: string;
  category: string;
  instructor: string;
  location: string;
  startDate: string;
  endDate: string | null;
  classStatus: string;
  enrollmentStatus: 'active' | 'completed' | 'cancelled' | string;
  enrolledAt: string;
}
