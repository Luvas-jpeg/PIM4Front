import { Component, Input, computed, signal } from '@angular/core';
import { AuditLog } from '../../../../core/models/audit.models';

@Component({
  selector: 'app-admin-audit',
  templateUrl: './admin-audit.html',
})
export class AdminAudit {
  private readonly auditLogsSignal = signal<AuditLog[]>([]);

  @Input()
  set auditLogs(value: AuditLog[]) {
    this.auditLogsSignal.set(value);
  }

  readonly search = signal('');
  readonly actionFilter = signal('all');
  readonly entityFilter = signal('all');

  readonly actions = computed(() =>
    [...new Set(this.auditLogsSignal().map(log => log.action))]
      .sort((first, second) => first.localeCompare(second))
  );

  readonly entities = computed(() =>
    [...new Set(this.auditLogsSignal().map(log => log.entityType))]
      .sort((first, second) => first.localeCompare(second))
  );

  readonly filteredLogs = computed(() => {
    const search = this.search().trim().toLowerCase();
    const action = this.actionFilter();
    const entity = this.entityFilter();

    return this.auditLogsSignal().filter(log => {
      const matchesSearch = !search
        || log.userName?.toLowerCase().includes(search)
        || log.entityId.toLowerCase().includes(search)
        || log.previousValue?.toLowerCase().includes(search)
        || log.newValue?.toLowerCase().includes(search);
      const matchesAction = action === 'all' || log.action === action;
      const matchesEntity = entity === 'all' || log.entityType === entity;

      return matchesSearch && matchesAction && matchesEntity;
    });
  });

  setSearch(value: string): void {
    this.search.set(value);
  }

  setActionFilter(value: string): void {
    this.actionFilter.set(value);
  }

  setEntityFilter(value: string): void {
    this.entityFilter.set(value);
  }

  auditActionLabel(value: string): string {
    const labels: Record<string, string> = {
      created: 'Criado',
      updated: 'Atualizado',
      archived: 'Arquivado',
      restored: 'Restaurado',
      status_changed: 'Status alterado',
      transferred: 'Transferido',
      refunded: 'Reembolsado',
      canceled: 'Cancelado',
      cancelled: 'Cancelado',
    };

    return labels[value] ?? value;
  }

  auditEntityLabel(value: string): string {
    const labels: Record<string, string> = {
      Course: 'Curso',
      CourseClass: 'Turma',
      Enrollment: 'Matricula',
      Order: 'Pedido',
      User: 'Usuario',
    };

    return labels[value] ?? value;
  }

  formatAuditValue(value: string | null): string {
    if (!value) return '-';

    const trimmed = value.trim();
    if (!trimmed) return '-';

    try {
      const parsed = JSON.parse(trimmed);
      const text = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
      return text.length > 180 ? `${text.slice(0, 180)}...` : text;
    } catch {
      return trimmed.length > 180 ? `${trimmed.slice(0, 180)}...` : trimmed;
    }
  }

  formatAuditDate(value: string): string {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  exportAuditCsv(): void {
    const rows = [
      ['Data', 'Usuario', 'Acao', 'Entidade', 'Id', 'Antes', 'Depois'],
      ...this.filteredLogs().map(log => [
        this.formatAuditDate(log.createdAt),
        log.userName || 'Sistema',
        this.auditActionLabel(log.action),
        this.auditEntityLabel(log.entityType),
        log.entityId,
        this.formatAuditValue(log.previousValue),
        this.formatAuditValue(log.newValue),
      ]),
    ];
    const csv = rows
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
