import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MyEnrollment } from '../models/enrollment.models';
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
}
