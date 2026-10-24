import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MyEnrollment, Participation } from '../../core/models/enrollment.models';
import { EnrollmentService } from '../../core/services/enrollment.service';

export function courseStartMessage(item: MyEnrollment, now: number): string {
  if (item.enrollmentStatus === 'cancelled' || item.classStatus === 'cancelled')
    return 'Turma ou matrícula cancelada';
  if (item.enrollmentStatus === 'completed' || ['completed', 'finished'].includes(item.classStatus))
    return 'Turma encerrada';
  const start = new Date(item.startDate);
  if (!Number.isFinite(start.getTime()) || start.getFullYear() < 1900) return 'Data a confirmar';
  if (start.getTime() <= now) return 'Sua turma já começou';
  const today = new Date(now);
  const days = Math.round(
    (Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000,
  );
  return days === 0
    ? 'É hoje! Prepare-se para sua turma.'
    : days === 1
      ? 'Seu curso começa amanhã'
      : `Seu curso começa em ${days} dias`;
}

@Component({
  selector: 'app-enrollment-schedule',
  imports: [DatePipe],
  template: `
    @if (enrollment().deliveryMode !== 'ead') {
      <section class="schedule" aria-label="Início e participação na turma">
        <strong>{{ message() }}</strong>
        @if (confirmed()) {
          <p class="confirmed">✓ Participação confirmada</p>
          <small>Confirmada em {{ participation()?.confirmedAt | date: 'dd/MM/yyyy HH:mm' }}</small>
        } @else if (canConfirm()) {
          <p>Confirme sua participação para ajudar na organização da turma.</p>
          <button type="button" [disabled]="saving()" (click)="confirm()">
            {{ saving() ? 'Confirmando...' : 'Confirmar minha participação' }}
          </button>
        } @else if (waiting()) {
          <p>
            A confirmação abre em {{ opensAt() | date: 'dd/MM/yyyy HH:mm' }}, uma semana antes da
            turma.
          </p>
        }
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .schedule {
      background: var(--color-primary-soft);
      border: 1px solid var(--color-border);
      border-radius: 14px;
      padding: 18px;
      margin: 12px 0;
      color: var(--color-text);
      overflow-wrap: anywhere;
    }
    strong {
      display: block;
      font-size: 1.05rem;
    }
    p {
      margin: 8px 0;
      line-height: 1.5;
    }
    small {
      display: block;
      line-height: 1.5;
    }
    .confirmed {
      color: #17603d;
      font-weight: 700;
    }
    .error {
      color: #a32020;
    }
    button {
      border: 0;
      border-radius: 9px;
      background: var(--color-primary);
      color: white;
      font: inherit;
      font-weight: 600;
      padding: 12px 16px;
      cursor: pointer;
      max-width: 100%;
      white-space: normal;
    }
    button:disabled {
      opacity: 0.65;
      cursor: wait;
    }
  `,
})
export class EnrollmentSchedule {
  readonly enrollment = input.required<MyEnrollment>();
  private readonly service = inject(EnrollmentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly now = signal(Date.now());
  private readonly saved = signal<{ id: number; start: string; value: Participation } | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = computed(() => courseStartMessage(this.enrollment(), this.now()));
  readonly opensAt = computed(
    () => new Date(new Date(this.enrollment().startDate).getTime() - 7 * 86400000),
  );
  readonly participation = computed(() => {
    const item = this.enrollment(),
      saved = this.saved();
    return saved?.id === item.enrollmentId && saved.start === item.startDate
      ? saved.value
      : item.participation;
  });
  readonly eligible = computed(
    () =>
      this.enrollment().deliveryMode !== 'ead' &&
      this.enrollment().enrollmentStatus === 'active' &&
      this.enrollment().classStatus === 'scheduled',
  );
  readonly confirmed = computed(
    () => this.eligible() && this.participation()?.status === 'confirmed',
  );
  readonly waiting = computed(
    () => this.eligible() && !this.confirmed() && this.now() < this.opensAt().getTime(),
  );
  readonly canConfirm = computed(
    () =>
      this.eligible() &&
      !this.confirmed() &&
      this.now() >= this.opensAt().getTime() &&
      this.now() < new Date(this.enrollment().startDate).getTime(),
  );

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 30000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  confirm(): void {
    if (this.saving() || !this.canConfirm()) return;
    this.saving.set(true);
    this.error.set(null);
    const item = this.enrollment();
    this.service
      .confirmParticipation(item.enrollmentId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (value) => this.saved.set({ id: item.enrollmentId, start: item.startDate, value }),
        error: (response) =>
          this.error.set(response.error?.message ?? 'Não foi possível confirmar. Tente novamente.'),
      });
  }
}
