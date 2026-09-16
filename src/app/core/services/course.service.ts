import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Course,
  CourseCatalogOptions,
  CourseCatalogQuery,
  CourseClass,
  CourseLesson,
  CourseLessonRequest,
  CourseModule,
  CourseModuleRequest,
  PagedCourseResponse,
  CourseRequest,
  CourseClassRequest,
} from '../models/course.models';
import { Student, TransferEnrollmentResponse } from '../models/student.models';
import { API_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Course[]> {
    return this.http.get<Course[]>(`${API_URL}/courses`, {
      params: { includeInactive: true },
    });
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

  archive(id: number): Observable<Course> {
    return this.http.post<Course>(`${API_URL}/courses/${id}/archive`, {});
  }

  restore(id: number): Observable<Course> {
    return this.http.post<Course>(`${API_URL}/courses/${id}/restore`, {});
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
    return this.http.put<CourseClass>(`${API_URL}/courses/${courseId}/classes/${classId}`, request);
  }

  getModules(courseId: number): Observable<CourseModule[]> {
    return this.http.get<CourseModule[]>(`${API_URL}/courses/${courseId}/modules`);
  }

  createModule(courseId: number, request: CourseModuleRequest): Observable<CourseModule> {
    return this.http.post<CourseModule>(`${API_URL}/courses/${courseId}/modules`, request);
  }

  updateModule(courseId: number, moduleId: number, request: CourseModuleRequest): Observable<CourseModule> {
    return this.http.put<CourseModule>(`${API_URL}/courses/${courseId}/modules/${moduleId}`, request);
  }

  createLesson(courseId: number, moduleId: number, request: CourseLessonRequest): Observable<CourseLesson> {
    return this.http.post<CourseLesson>(`${API_URL}/courses/${courseId}/modules/${moduleId}/lessons`, request);
  }

  updateLesson(
    courseId: number,
    moduleId: number,
    lessonId: number,
    request: CourseLessonRequest,
  ): Observable<CourseLesson> {
    return this.http.put<CourseLesson>(
      `${API_URL}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
      request,
    );
  }

  getClassStudents(courseId: number, classId: number): Observable<Student[]> {
    return this.http.get<Student[]>(`${API_URL}/courses/${courseId}/classes/${classId}/students`);
  }

  updateStudentStatus(
    courseId: number,
    classId: number,
    studentId: number,
    status: Student['status'],
  ): Observable<Student> {
    return this.http.patch<Student>(
      `${API_URL}/courses/${courseId}/classes/${classId}/students/${studentId}/status`,
      { status },
    );
  }

  transferStudent(
    courseId: number,
    classId: number,
    studentId: number,
    targetClassId: number,
  ): Observable<TransferEnrollmentResponse> {
    return this.http.post<TransferEnrollmentResponse>(
      `${API_URL}/courses/${courseId}/classes/${classId}/students/${studentId}/transfer`,
      { targetClassId },
    );
  }
}
