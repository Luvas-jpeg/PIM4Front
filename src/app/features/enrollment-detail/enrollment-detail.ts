import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MyEnrollment } from '../../core/models/enrollment.models';
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
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = computed(() => {
    const current = this.enrollment();

    if (!current) {
      return null;
    }

    if (current.enrollmentStatus === 'cancelled' || current.classStatus === 'cancelled') {
      return {
        type: 'warning',
        text: 'Esta matricula ou turma foi cancelada. Consulte o historico do pedido para verificar o pagamento.'
      };
    }

    if (current.enrollmentStatus === 'completed' || current.classStatus === 'finished') {
      return {
        type: 'success',
        text: 'Esta turma foi encerrada. Seu historico de matricula continua disponivel.'
      };
    }

    if (new Date(current.startDate).getTime() <= Date.now()) {
      return {
        type: 'info',
        text: 'A turma ja iniciou. Consulte a organizacao caso precise de orientacoes adicionais.'
      };
    }

    return {
      type: 'info',
      text: 'Sua matricula esta ativa. Guarde estas informacoes para o dia da aula.'
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
      next: enrollment => this.enrollment.set(enrollment),
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
}
