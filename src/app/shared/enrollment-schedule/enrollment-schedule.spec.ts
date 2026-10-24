import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { MyEnrollment, Participation } from '../../core/models/enrollment.models';
import { EnrollmentService } from '../../core/services/enrollment.service';
import { courseStartMessage, EnrollmentSchedule } from './enrollment-schedule';

describe('EnrollmentSchedule', () => {
  const start = new Date(2030, 5, 10, 15).getTime();
  const item: MyEnrollment = {
    enrollmentId: 42,
    courseId: 8,
    classId: 1,
    orderId: 12,
    courseName: 'Curso teste',
    courseDescription: '',
    courseImage: '',
    category: '',
    deliveryMode: 'presencial',
    workloadHours: 8,
    instructor: 'Ana',
    location: 'Centro',
    startDate: new Date(start).toISOString(),
    endDate: null,
    classStatus: 'scheduled',
    enrollmentStatus: 'active',
    enrolledAt: '',
    modules: [],
    assessments: [],
    assessmentAttempts: [],
  };
  const confirmed: Participation = {
    status: 'confirmed',
    opensAt: null,
    confirmedAt: new Date(start - 86400000).toISOString(),
    canConfirm: false,
  };
  const service = { confirmParticipation: vi.fn() };
  beforeEach(async () => {
    vi.spyOn(Date, 'now').mockReturnValue(start - 3 * 86400000);
    service.confirmParticipation.mockReset().mockReturnValue(of(confirmed));
    await TestBed.configureTestingModule({
      imports: [EnrollmentSchedule],
      providers: [{ provide: EnrollmentService, useValue: service }],
    }).compileComponents();
  });
  afterEach(() => vi.restoreAllMocks());

  function render(overrides: Partial<MyEnrollment> = {}) {
    const fixture = TestBed.createComponent(EnrollmentSchedule);
    fixture.componentRef.setInput('enrollment', { ...item, ...overrides });
    fixture.detectChanges();
    return fixture;
  }

  it('shows today, tomorrow, future and started without a misleading negative count', () => {
    expect(courseStartMessage(item, start - 3 * 86400000)).toContain('3 dias');
    expect(courseStartMessage(item, start - 86400000)).toContain('amanhã');
    expect(courseStartMessage(item, start - 3600000)).toContain('É hoje');
    expect(courseStartMessage(item, start)).toContain('já começou');
  });

  it('opens only during the last seven days and never for cancelled or online enrollments', () => {
    vi.mocked(Date.now).mockReturnValue(start - 8 * 86400000);
    const early = render();
    expect(early.nativeElement.querySelector('button')).toBeNull();
    expect(early.nativeElement.textContent).toContain('A confirmação abre');
    early.destroy();
    vi.mocked(Date.now).mockReturnValue(start - 7 * 86400000);
    expect(render().componentInstance.canConfirm()).toBe(true);
    expect(render({ enrollmentStatus: 'cancelled' }).componentInstance.canConfirm()).toBe(false);
    expect(render({ deliveryMode: 'ead' }).nativeElement.textContent.trim()).toBe('');
  });

  it('sends the enrollment id once, shows saved confirmation and keeps other enrollments independent', () => {
    const pending = new Subject<Participation>();
    service.confirmParticipation.mockReturnValue(pending);
    const fixture = render();
    fixture.componentInstance.confirm();
    fixture.componentInstance.confirm();
    expect(service.confirmParticipation).toHaveBeenCalledExactlyOnceWith(42);
    pending.next(confirmed);
    pending.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Participação confirmada');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    fixture.componentRef.setInput('enrollment', { ...item, enrollmentId: 43 });
    fixture.detectChanges();
    expect(fixture.componentInstance.confirmed()).toBe(false);
  });

  it('preserves the enrollment and allows retry after an API failure', () => {
    service.confirmParticipation.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'Tente novamente.' } })),
    );
    const fixture = render();
    fixture.componentInstance.confirm();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Tente novamente',
    );
    expect(fixture.componentInstance.saving()).toBe(false);
    fixture.componentInstance.confirm();
    fixture.detectChanges();
    expect(fixture.componentInstance.confirmed()).toBe(true);
    expect(fixture.componentInstance.enrollment().enrollmentStatus).toBe('active');
  });
});
