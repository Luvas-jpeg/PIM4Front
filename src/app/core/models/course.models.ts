export interface CourseClass {
  id: number;
  courseId: number;
  startDate: string;
  endDate?: string | null;
  local: string;
  instructor: string;
  capacity: number;
  availableSeats: number;
  status: string;
}

export interface Course {
  id: number;
  nome: string;
  description: string;
  preco: number;
  image: string;
  category: string;
  deliveryMode: 'presencial' | 'ead';
  workloadHours: number;
  isActive: boolean;
  legacyProductId?: number | null;
  classes: CourseClass[];
  modules: CourseModule[];
}

export interface CourseModule {
  id: number;
  courseId: number;
  title: string;
  sortOrder: number;
  isActive: boolean;
  lessons: CourseLesson[];
}

export interface CourseLesson {
  id: number;
  moduleId: number;
  title: string;
  description: string;
  videoUrl: string;
  durationMinutes: number;
  sortOrder: number;
  isActive: boolean;
}

export interface CourseCatalogQuery {
  search?: string;
  category?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  availableOnly?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedCourseResponse {
  items: Course[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CourseCatalogOptions {
  categories: string[];
  cities: string[];
}
export interface CourseRequest {
  nome: string;
  description: string;
  preco: number;
  image: string;
  category: string;
  deliveryMode: 'presencial' | 'ead';
  workloadHours: number;
  isActive: boolean;
}

export interface CourseModuleRequest {
  title: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CourseLessonRequest {
  title: string;
  description: string;
  videoUrl: string;
  durationMinutes: number;
  sortOrder: number;
  isActive: boolean;
}

export interface CourseClassRequest {
  startDate: string;
  endDate: string | null;
  local: string;
  instructor: string;
  capacity: number;
  status: string;
}
