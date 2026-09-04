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
  isActive: boolean;
  legacyProductId?: number | null;
  classes: CourseClass[];
}
