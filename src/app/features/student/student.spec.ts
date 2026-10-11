import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Student } from './student';
import { AuthService } from '../../core/services/auth.service';
import { EnrollmentService } from '../../core/services/enrollment.service';
import { MyEnrollment } from '../../core/models/enrollment.models';

describe('Student', () => {
  const enrollment: MyEnrollment = {
    enrollmentId: 42, courseId: 8, classId: 1, orderId: 12,
    courseName: 'Biossegurança', courseDescription: '', courseImage: '',
    category: 'Saúde', deliveryMode: 'presencial', workloadHours: 8,
    instructor: 'Ana', location: 'São Paulo', startDate: '2026-10-20T17:00:00Z',
    endDate: null, classStatus: 'scheduled', enrollmentStatus: 'active',
    enrolledAt: '2026-10-08T17:00:00Z', modules: [], assessments: [], assessmentAttempts: [],
  };
  const service = { getMine: vi.fn() };

  beforeEach(async () => {
    service.getMine.mockReset().mockReturnValue(of([
      enrollment,
      { ...enrollment, enrollmentId: 43, courseName: 'Sutura', enrollmentStatus: 'completed' },
      { ...enrollment, enrollmentId: 44, enrollmentStatus: 'cancelled' },
    ]));
    await TestBed.configureTestingModule({
      imports: [Student],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: () => ({ nome: 'Aluno Teste' }) } },
        { provide: EnrollmentService, useValue: service },
      ],
    }).compileComponents();
  });

  it('uses the enrollment id, rather than the course id, to open a course', () => {
    const fixture = TestBed.createComponent(Student);
    fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('a')].map((link: any) => link.getAttribute('href'));
    expect(links).toContain('/area-aluno/matricula/42');
    expect(links).toContain('/conta/pedido/12');
    expect(fixture.componentInstance.activeCount()).toBe(1);
    expect(fixture.componentInstance.completedCount()).toBe(1);
    expect(fixture.componentInstance.cancelledCount()).toBe(1);
  });

  it('combines enrollment status with course, location and instructor search', () => {
    const fixture = TestBed.createComponent(Student);
    const component = fixture.componentInstance;
    component.status.set('active');
    component.search.set('ana');
    expect(component.filteredEnrollments().map(item => item.enrollmentId)).toEqual([42]);
    component.search.set('Sutura');
    expect(component.filteredEnrollments()).toEqual([]);
    component.status.set('completed');
    expect(component.filteredEnrollments().map(item => item.enrollmentId)).toEqual([43]);
  });

  it('ends loading on failure and allows a successful retry', () => {
    service.getMine.mockReturnValueOnce(throwError(() => new Error('offline')));
    const fixture = TestBed.createComponent(Student);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.componentInstance.enrollments().length).toBe(3);
  });

  it('explains that an enrollment appears after payment confirmation', () => {
    service.getMine.mockReturnValueOnce(of([]));
    const fixture = TestBed.createComponent(Student);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('após a confirmação do pagamento');
    expect(fixture.nativeElement.querySelector('.course-card')).toBeNull();
  });

  it('shows loading until the enrollment request finishes', () => {
    const response = new Subject<MyEnrollment[]>();
    service.getMine.mockReturnValueOnce(response);
    const fixture = TestBed.createComponent(Student);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(true);
    response.next([enrollment]);
    response.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.querySelector('.course-card')).toBeTruthy();
  });
});