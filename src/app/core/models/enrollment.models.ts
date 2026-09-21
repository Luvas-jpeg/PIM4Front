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
  assessments: MyCourseAssessment[];
  assessmentAttempts: MyAssessmentAttempt[];
  certificate?: MyCertificateDTO | null;
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

export interface MyCourseAssessment {
  id: number;
  courseId: number;
  title: string;
  minimumScore: number;
  maxAttempts: number;
  questions: MyCourseQuestion[];
}

export interface MyCourseQuestion {
  id: number;
  assessmentId: number;
  statement: string;
  sortOrder: number;
  options: MyCourseQuestionOption[];
}

export interface MyCourseQuestionOption {
  id: number;
  questionId: number;
  text: string;
  sortOrder: number;
}

export interface MyAssessmentAttempt {
  id: number;
  assessmentId: number;
  attemptNumber: number;
  score: number;
  passed: boolean;
  submittedAt: string;
}

export interface SubmitAssessmentRequest {
  answers: SubmitAssessmentAnswer[];
}

export interface SubmitAssessmentAnswer {
  questionId: number;
  selectedOptionId: number;
}

export interface SubmitAssessmentResponse {
  assessmentId: number;
  attemptNumber: number;
  score: number;
  minimumScore: number;
  passed: boolean;
  remainingAttempts: number;
}

export interface MyCertificateDTO {
  id: number;
  courseId: number;
  courseName: string;
  studentName: string;
  workloadHours: number;
  validationCode: string;
  issuedAt: string;
}

export interface CertificateStatus {
  eligible: boolean;
  reason: string;
  certificate?: MyCertificateDTO | null;
}
