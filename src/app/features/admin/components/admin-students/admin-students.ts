import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { Student } from '../../../../core/models/student.models';
import { AdminNotification } from '../../admin.types';

@Component({
  selector: 'app-admin-students',
  templateUrl: './admin-students.html',
})
export class AdminStudents {
  private readonly studentsSignal = signal<Student[]>([]);

  @Input()
  set students(value: Student[]) {
    this.studentsSignal.set(value);
  }

  @Output() notify = new EventEmitter<AdminNotification>();

  readonly search = signal('');
  readonly statusFilter = signal('all');
  readonly selectedStudent = signal<Student | null>(null);

  readonly filteredStudents = computed(() => {
    const search = this.search().trim().toLowerCase();
    const status = this.statusFilter();

    return this.studentsSignal().filter(student => {
      const matchesSearch = !search
        || student.name.toLowerCase().includes(search)
        || student.email.toLowerCase().includes(search)
        || student.phone.toLowerCase().includes(search)
        || student.courseName.toLowerCase().includes(search);
      const matchesStatus = status === 'all' || student.status === status;

      return matchesSearch && matchesStatus;
    });
  });

  readonly activeCount = computed(() =>
    this.studentsSignal().filter(student => student.status === 'active').length
  );

  readonly completedCount = computed(() =>
    this.studentsSignal().filter(student => student.status === 'completed').length
  );

  readonly cancelledCount = computed(() =>
    this.studentsSignal().filter(student => student.status === 'cancelled').length
  );

  setSearch(value: string): void {
    this.search.set(value);
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set(value);
  }

  studentStatusLabel(value: string): string {
    const labels: Record<string, string> = {
      active: 'Ativa',
      completed: 'Concluida',
      cancelled: 'Cancelada',
    };

    return labels[value] ?? value;
  }

  openStudent(student: Student): void {
    this.selectedStudent.set(student);
  }

  closeStudent(): void {
    this.selectedStudent.set(null);
  }
}
