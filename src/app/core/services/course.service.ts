import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Course, CourseClass } from '../models/course.models';

const API_URL = 'http://localhost:5278/api';

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Course[]> {
    return this.http.get<Course[]>(`${API_URL}/courses`);
  }

  getById(id: number): Observable<Course> {
    return this.http.get<Course>(`${API_URL}/courses/${id}`);
  }

  getClasses(id: number): Observable<CourseClass[]> {
    return this.http.get<CourseClass[]>(`${API_URL}/courses/${id}/classes`);
  }
}
