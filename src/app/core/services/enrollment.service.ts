import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CourseProgress, MyEnrollment, UpdateProgressRequest } from '../models/enrollment.models';
import { API_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly http = inject(HttpClient);

  getMine(): Observable<MyEnrollment[]> {
    return this.http.get<MyEnrollment[]>(`${API_URL}/me/courses`);
  }

  getById(id: number): Observable<MyEnrollment> {
    return this.http.get<MyEnrollment>(`${API_URL}/me/enrollments/${id}`);
  }

  getProgress(courseId: number): Observable<CourseProgress> {
    return this.http.get<CourseProgress>(`${API_URL}/me/courses/${courseId}/progress`);
  }

  updateProgress(courseId: number, request: UpdateProgressRequest): Observable<CourseProgress> {
    return this.http.put<CourseProgress>(`${API_URL}/me/courses/${courseId}/progress`, request);
  }
}
