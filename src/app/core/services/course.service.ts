import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Course,
  CourseCatalogOptions,
  CourseCatalogQuery,
  CourseClass,
  PagedCourseResponse,
} from '../models/course.models';
import { Student } from '../models/student.models';

const API_URL = 'http://localhost:5278/api';

export interface CourseRequest {
  nome: string;
  description: string;
  preco: number;
  image: string;
  category: string;
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

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Course[]> {
    return this.http.get<Course[]>(`${API_URL}/courses`);
  }

  getCatalog(query: CourseCatalogQuery): Observable<PagedCourseResponse> {
    return this.http.get<PagedCourseResponse>(`${API_URL}/courses/catalog`, {
      params: {
        ...(query.search ? { search: query.search } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.city ? { city: query.city } : {}),
        ...(query.startDate ? { startDate: query.startDate } : {}),
        ...(query.endDate ? { endDate: query.endDate } : {}),
        availableOnly: query.availableOnly ?? true,
        sort: query.sort ?? 'date',
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 9,
      },
    });
  }

  getCatalogOptions(): Observable<CourseCatalogOptions> {
    return this.http.get<CourseCatalogOptions>(`${API_URL}/courses/catalog/options`);
  }

  getById(id: number): Observable<Course> {
    return this.http.get<Course>(`${API_URL}/courses/${id}`);
  }

  create(request: CourseRequest): Observable<Course> {
    return this.http.post<Course>(`${API_URL}/courses`, request);
  }

  update(id: number, request: CourseRequest): Observable<Course> {
    return this.http.put<Course>(`${API_URL}/courses/${id}`, request);
  }

  getClasses(id: number): Observable<CourseClass[]> {
    return this.http.get<CourseClass[]>(`${API_URL}/courses/${id}/classes`);
  }

  createClass(courseId: number, request: CourseClassRequest): Observable<CourseClass> {
    return this.http.post<CourseClass>(`${API_URL}/courses/${courseId}/classes`, request);
  }

  updateClass(
    courseId: number,
    classId: number,
    request: CourseClassRequest,
  ): Observable<CourseClass> {
    return this.http.put<CourseClass>(
      `${API_URL}/courses/${courseId}/classes/${classId}`,
      request,
    );
  }

  getClassStudents(courseId: number, classId: number): Observable<Student[]> {
    return this.http.get<Student[]>(`${API_URL}/courses/${courseId}/classes/${classId}/students`);
  }
}
