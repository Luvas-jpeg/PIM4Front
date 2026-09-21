import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CourseProgress,
  CertificateStatus,
  MyEnrollment,
  SubmitAssessmentRequest,
  SubmitAssessmentResponse,
  UpdateProgressRequest,
} from '../models/enrollment.models';
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

  submitAssessment(
    courseId: number,
    assessmentId: number,
    request: SubmitAssessmentRequest,
  ): Observable<SubmitAssessmentResponse> {
    return this.http.post<SubmitAssessmentResponse>(
      `${API_URL}/me/courses/${courseId}/assessments/${assessmentId}/submit`,
      request,
    );
  }

  getCertificateStatus(courseId: number): Observable<CertificateStatus> {
    return this.http.get<CertificateStatus>(`${API_URL}/me/courses/${courseId}/certificate`);
  }

  issueCertificate(courseId: number): Observable<CertificateStatus> {
    return this.http.post<CertificateStatus>(`${API_URL}/me/courses/${courseId}/certificate/issue`, {});
  }
}
