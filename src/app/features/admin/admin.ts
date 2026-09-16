import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { AuditLog } from '../../core/models/audit.models';
import { Course } from '../../core/models/course.models';
import { Order } from '../../core/models/order.models';
import { PromoCode } from '../../core/models/promo-codes.models';
import { Student } from '../../core/models/student.models';
import { AuditService } from '../../core/services/audit.service';
import { CourseService } from '../../core/services/course.service';
import { OrderService } from '../../core/services/order.service';
import { PromoCodeService } from '../../core/services/promo-code.service';
import { StudentService } from '../../core/services/student.service';
import { AdminNotification, AdminTab } from './admin.types';
import { AdminAudit } from './components/admin-audit/admin-audit';
import { AdminClasses } from './components/admin-classes/admin-classes';
import { AdminCoupons } from './components/admin-coupons/admin-coupons';
import { AdminCourses } from './components/admin-courses/admin-courses';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { AdminEadContent } from './components/admin-ead-content/admin-ead-content';
import { AdminOrders } from './components/admin-orders/admin-orders';
import { AdminStudents } from './components/admin-students/admin-students';

@Component({
  selector: 'app-admin',
  imports: [
    AdminAudit,
    AdminClasses,
    AdminCoupons,
    AdminCourses,
    AdminDashboard,
    AdminEadContent,
    AdminOrders,
    AdminStudents,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
  encapsulation: ViewEncapsulation.None,
})
export class Admin {
  private readonly courseService = inject(CourseService);
  private readonly orderService = inject(OrderService);
  private readonly auditService = inject(AuditService);
  private readonly promoCodeService = inject(PromoCodeService);
  private readonly studentService = inject(StudentService);

  readonly activeTab = signal<AdminTab>('dashboard');
  readonly courses = signal<Course[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly auditLogs = signal<AuditLog[]>([]);
  readonly promoCodes = signal<PromoCode[]>([]);
  readonly students = signal<Student[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  constructor() {
    this.loadAdminData();
  }

  setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
    this.error.set(null);
    this.success.set(null);
  }

  setCourses(courses: Course[]): void {
    this.courses.set(courses);
  }

  setOrders(orders: Order[]): void {
    this.orders.set(orders);
  }

  setPromoCodes(promoCodes: PromoCode[]): void {
    this.promoCodes.set(promoCodes);
  }

  handleNotification(notification: AdminNotification): void {
    this.error.set(notification.type === 'error' ? notification.message : null);
    this.success.set(notification.type === 'success' ? notification.message : null);
  }

  loadAdminData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.courseService.getAll().subscribe({
      next: courses => this.courses.set(courses),
      error: () => this.error.set('Nao foi possivel carregar cursos.'),
    });

    this.orderService.getAll().subscribe({
      next: orders => this.orders.set(orders),
      error: () => this.error.set('Nao foi possivel carregar pedidos.'),
    });

    this.promoCodeService.getAll().subscribe({
      next: promoCodes => this.promoCodes.set(promoCodes),
      error: () => this.error.set('Nao foi possivel carregar cupons.'),
    });

    this.studentService.getAll().subscribe({
      next: students => this.students.set(students),
      error: () => this.error.set('Nao foi possivel carregar alunos.'),
    });

    this.auditService.getAll().subscribe({
      next: auditLogs => this.auditLogs.set(auditLogs),
      error: () => this.error.set('Nao foi possivel carregar a auditoria.'),
    });

    this.loading.set(false);
  }
}
