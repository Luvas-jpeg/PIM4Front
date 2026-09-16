import { CourseModule } from './course.models';

export interface MyEnrollment {
  enrollmentId: number;
  courseId: number | null;
  classId: number | null;
  orderId: number;
  courseName: string;
  courseDescription: string;
  courseImage: string;
  category: string;
  deliveryMode: 'presencial' | 'ead';
  workloadHours: number;
  instructor: string;
  location: string;
  startDate: string;
  endDate: string | null;
  classStatus: string;
  enrollmentStatus: 'active' | 'completed' | 'cancelled' | string;
  enrolledAt: string;
  modules: CourseModule[];
}

export interface CourseProgress {
  courseId: number;
  percent: number;
  completedLessons: number[];
  lastSeenAt?: string;
  completedAt?: string;
}

export interface UpdateProgressRequest {
  percent: number;
  completedLessonId?: number;
}
