import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CertificateStatus, CourseProgress, MyCourseAssessment, MyEnrollment, SubmitAssessmentResponse } from '../../core/models/enrollment.models';
import { EnrollmentService } from '../../core/services/enrollment.service';

@Component({
  selector: 'app-enrollment-detail',
  imports: [RouterLink],
  templateUrl: './enrollment-detail.html',
  styleUrl: './enrollment-detail.scss',
})
export class EnrollmentDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly enrollmentService = inject(EnrollmentService);

  readonly enrollment = signal<MyEnrollment | null>(null);
  readonly progress = signal<CourseProgress | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly progressError = signal<string | null>(null);
  readonly assessmentError = signal<string | null>(null);
  readonly assessmentResult = signal<SubmitAssessmentResponse | null>(null);
  readonly assessmentAnswers = signal<Record<number, number>>({});
  readonly certificateStatus = signal<CertificateStatus | null>(null);
  readonly certificateError = signal<string | null>(null);
  readonly savingLessonId = signal<number | null>(null);
  readonly submittingAssessmentId = signal<number | null>(null);
  readonly issuingCertificate = signal(false);
  readonly certificate = computed(() =>
    this.certificateStatus()?.certificate ?? this.enrollment()?.certificate ?? null
  );

  readonly notice = computed(() => {
    const current = this.enrollment();

    if (!current) return null;

    if (current.deliveryMode === 'ead') {
      if (current.enrollmentStatus === 'cancelled') {
        return {
          type: 'warning',
          text: 'Esta matricula EAD foi cancelada. Consulte o historico do pedido para verificar o pagamento.',
        };
      }

      if (this.progress()?.percent === 100) {
        return {
          type: 'success',
          text: 'Curso EAD concluido. A emissao de certificado ainda depende da regra academica definida para o projeto.',
        };
      }

      return {
        type: 'info',
        text: 'Sua matricula EAD esta ativa. Acompanhe as aulas e marque o progresso conforme estudar.',
      };
    }

    if (current.enrollmentStatus === 'cancelled' || current.classStatus === 'cancelled') {
      return {
        type: 'warning',
        text: 'Esta matricula ou turma foi cancelada. Consulte o historico do pedido para verificar o pagamento.',
      };
    }

    if (current.enrollmentStatus === 'completed' || current.classStatus === 'finished') {
      return {
        type: 'success',
        text: 'Esta turma foi encerrada. Seu historico de matricula continua disponivel.',
      };
    }

    if (new Date(current.startDate).getTime() <= Date.now()) {
      return {
        type: 'info',
        text: 'A turma ja iniciou. Consulte a organizacao caso precise de orientacoes adicionais.',
      };
    }

    return {
      type: 'info',
      text: 'Sua matricula esta ativa. Guarde estas informacoes para o dia da aula.',
    };
  });

  constructor() {
    const enrollmentId = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
      this.loading.set(false);
      this.error.set('Matricula invalida.');
      return;
    }

    this.enrollmentService.getById(enrollmentId).subscribe({
      next: enrollment => {
        this.enrollment.set(enrollment);

        if (enrollment.deliveryMode === 'ead' && enrollment.courseId) {
          this.loadProgress(enrollment.courseId);
          this.loadCertificateStatus(enrollment.courseId);
        }
      },
      error: response => {
        this.error.set(response.error?.message ?? 'Nao foi possivel carregar a matricula.');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(value));
  }

  statusLabel(value: string): string {
    const labels: Record<string, string> = {
      active: 'Ativa',
      completed: 'Concluida',
      cancelled: 'Cancelada',
      scheduled: 'Agendada',
      finished: 'Encerrada',
    };

    return labels[value] ?? value;
  }

  isLessonCompleted(lessonId: number): boolean {
    return this.progress()?.completedLessons.includes(lessonId) ?? false;
  }

  totalLessons(): number {
    return this.enrollment()?.modules
      .reduce((total, module) => total + module.lessons.length, 0) ?? 0;
  }

  completedLessons(): number {
    return this.progress()?.completedLessons.length ?? 0;
  }

  toggleLesson(lessonId: number): void {
    const enrollment = this.enrollment();

    if (!enrollment?.courseId || this.isLessonCompleted(lessonId)) {
      return;
    }

    const totalLessons = this.totalLessons();
    const nextCompleted = this.completedLessons() + 1;
    const percent = totalLessons > 0
      ? Math.min(100, Math.round((nextCompleted / totalLessons) * 100))
      : 0;

    this.savingLessonId.set(lessonId);
    this.progressError.set(null);
    this.enrollmentService.updateProgress(enrollment.courseId, {
      percent,
      completedLessonId: lessonId,
    }).subscribe({
      next: progress => {
        this.progress.set(progress);
        if (progress.percent >= 100) {
          this.refreshCertificateStatus();
        }
      },
      error: response => this.progressError.set(
        response.error?.message ?? 'Nao foi possivel atualizar seu progresso.'
      ),
      complete: () => this.savingLessonId.set(null),
    });
  }

  selectedOption(questionId: number): number | null {
    return this.assessmentAnswers()[questionId] ?? null;
  }

  selectOption(questionId: number, optionId: number): void {
    this.assessmentAnswers.update(answers => ({
      ...answers,
      [questionId]: optionId,
    }));
    this.assessmentError.set(null);
  }

  attemptsForAssessment(assessmentId: number) {
    return this.enrollment()?.assessmentAttempts
      .filter(attempt => attempt.assessmentId === assessmentId) ?? [];
  }

  remainingAttempts(assessment: MyCourseAssessment): number {
    return Math.max(0, assessment.maxAttempts - this.attemptsForAssessment(assessment.id).length);
  }

  latestAttempt(assessmentId: number) {
    return this.attemptsForAssessment(assessmentId)[0] ?? null;
  }

  submitAssessment(assessment: MyCourseAssessment): void {
    const enrollment = this.enrollment();

    if (!enrollment?.courseId) return;

    const answers = assessment.questions.map(question => ({
      questionId: question.id,
      selectedOptionId: this.selectedOption(question.id) ?? 0,
    }));

    if (answers.some(answer => !answer.selectedOptionId)) {
      this.assessmentError.set('Responda todas as questoes antes de enviar.');
      return;
    }

    this.submittingAssessmentId.set(assessment.id);
    this.assessmentError.set(null);
    this.assessmentResult.set(null);
    this.enrollmentService.submitAssessment(enrollment.courseId, assessment.id, { answers }).subscribe({
      next: result => {
        this.assessmentResult.set(result);
        this.enrollment.update(current => current
          ? {
              ...current,
              assessmentAttempts: [
                {
                  id: Date.now(),
                  assessmentId: result.assessmentId,
                  attemptNumber: result.attemptNumber,
                  score: result.score,
                  passed: result.passed,
                  submittedAt: new Date().toISOString(),
                },
                ...current.assessmentAttempts,
              ],
            }
          : current
        );
        if (result.passed) {
          this.refreshCertificateStatus();
        }
      },
      error: response => this.assessmentError.set(
        response.error?.message ?? 'Nao foi possivel enviar a avaliacao.'
      ),
      complete: () => this.submittingAssessmentId.set(null),
    });
  }

  issueCertificate(): void {
    const courseId = this.enrollment()?.courseId;
    if (!courseId) return;

    this.issuingCertificate.set(true);
    this.certificateError.set(null);
    this.enrollmentService.issueCertificate(courseId).subscribe({
      next: status => {
        this.certificateStatus.set(status);
        this.enrollment.update(current => current
          ? { ...current, certificate: status.certificate ?? current.certificate }
          : current
        );
      },
      error: response => this.certificateError.set(
        response.error?.message ?? 'Nao foi possivel emitir o certificado.'
      ),
      complete: () => this.issuingCertificate.set(false),
    });
  }

  private loadProgress(courseId: number): void {
    this.enrollmentService.getProgress(courseId).subscribe({
      next: progress => {
        this.progress.set(progress);
        if (progress.percent >= 100) {
          this.refreshCertificateStatus();
        }
      },
      error: response => this.progressError.set(
        response.error?.message ?? 'Nao foi possivel carregar seu progresso.'
      ),
    });
  }

  private loadCertificateStatus(courseId: number): void {
    this.enrollmentService.getCertificateStatus(courseId).subscribe({
      next: status => this.certificateStatus.set(status),
      error: response => this.certificateError.set(
        response.error?.message ?? 'Nao foi possivel carregar o status do certificado.'
      ),
    });
  }

  private refreshCertificateStatus(): void {
    const courseId = this.enrollment()?.courseId;
    if (!courseId) return;
    this.loadCertificateStatus(courseId);
  }
}
