import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Student, StudentRequest } from '../models/student.models';

const API_URL = 'http://localhost:5278/api';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Student[]> {
    return this.http.get<Student[]>(`${API_URL}/Students`);
  }

  create(request: StudentRequest): Observable<Student> {
    return this.http.post<Student>(`${API_URL}/Students`, request);
  }

  update(id: number, request: StudentRequest): Observable<Student> {
    return this.http.put<Student>(`${API_URL}/Students/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/Students/${id}`);
  }
}
