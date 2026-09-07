import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Order } from '../../core/models/order.models';
import { Course, CourseClass } from '../../core/models/course.models';
import { PromoCode, PromoCodeRequest } from '../../core/models/promo-codes.models';
import { Student } from '../../core/models/student.models';
import { OrderService } from '../../core/services/order.service';
import {
  CourseClassRequest,
  CourseRequest,
  CourseService,
} from '../../core/services/course.service';
import { PromoCodeService } from '../../core/services/promo-code.service';

type AdminTab = 'dashboard' | 'products' | 'classes' | 'coupons' | 'orders';
type Period = 'day' | 'week' | 'month' | 'year';
type ProductType = 'course';
type DiscountType = 'percentage' | 'fixed';

interface RevenueChartPoint {
  label: string;
  value: number;
  percent: number;
}

interface StatusChartItem {
  status: string;
  count: number;
  percent: number;
}

interface TopProductItem {
  name: string;
  quantity: number;
  total: number;
  percent: number;
}

@Component({
  selector: 'app-admin',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly courseService = inject(CourseService);
  private readonly orderService = inject(OrderService);
  private readonly promoCodeService = inject(PromoCodeService);
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  readonly activeTab = signal<AdminTab>('dashboard');
  readonly period = signal<Period>('day');
  readonly courses = signal<Course[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly promoCodes = signal<PromoCode[]>([]);
  readonly loading = signal(false);
  readonly savingProduct = signal(false);
  readonly savingCoupon = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly editingProductId = signal<number | null>(null);
  readonly editingCouponId = signal<number | null>(null);
  readonly selectedCourse = signal<Course | null>(null);
  readonly selectedClass = signal<CourseClass | null>(null);
  readonly selectedStudents = signal<Student[]>([]);
  readonly activeFormModal = signal<'course' | 'class' | 'coupon' | null>(null);
  readonly editingClassId = signal<number | null>(null);

  readonly productForm = this.formBuilder.group({
    nome: this.formBuilder.control('', [Validators.required]),
    preco: this.formBuilder.control(0, [Validators.required, Validators.min(0.01)]),
    tipoProduto: this.formBuilder.control<ProductType>('course', [Validators.required]),
    estoque: this.formBuilder.control(0, [Validators.required, Validators.min(0)]),
    description: this.formBuilder.control(''),
    image: this.formBuilder.control(''),
    category: this.formBuilder.control(''),
    date: this.formBuilder.control(''),
    location: this.formBuilder.control(''),
    instructor: this.formBuilder.control(''),
  });

  readonly couponForm = this.formBuilder.group({
    code: this.formBuilder.control('', [Validators.required]),
    discount: this.formBuilder.control(0, [Validators.required, Validators.min(0.01)]),
    discountType: this.formBuilder.control<DiscountType>('percentage', [Validators.required]),
    startDate: this.formBuilder.control('', [Validators.required]),
    endDate: this.formBuilder.control('', [Validators.required]),
    isActive: this.formBuilder.control(true),
    usageLimit: this.formBuilder.control<number | null>(null),
    usageCount: this.formBuilder.control(0),
  });

  readonly classForm = this.formBuilder.group({
    startDate: this.formBuilder.control('', [Validators.required]),
    endDate: this.formBuilder.control(''),
    local: this.formBuilder.control('', [Validators.required]),
    instructor: this.formBuilder.control('', [Validators.required]),
    capacity: this.formBuilder.control(1, [Validators.required, Validators.min(1)]),
    status: this.formBuilder.control('scheduled', [Validators.required]),
  });

  readonly activeOrders = computed(() =>
    this.orders().filter(order => order.status !== 'Cancelado')
  );

  readonly filteredOrders = computed(() => {
    const now = new Date();
    const selectedPeriod = this.period();

    return this.activeOrders().filter(order => {
      const orderDate = new Date(order.dataPedido);

      if (Number.isNaN(orderDate.getTime())) {
        return false;
      }

      if (selectedPeriod === 'day') {
        return orderDate.toDateString() === now.toDateString();
      }

      if (selectedPeriod === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        return orderDate >= start && orderDate <= now;
      }

      if (selectedPeriod === 'month') {
        return orderDate.getMonth() === now.getMonth()
          && orderDate.getFullYear() === now.getFullYear();
      }

      return orderDate.getFullYear() === now.getFullYear();
    });
  });

  readonly revenue = computed(() =>
    this.filteredOrders().reduce((sum, order) => sum + order.total, 0)
  );

  readonly averageTicket = computed(() => {
    const orders = this.filteredOrders();
    return orders.length ? this.revenue() / orders.length : 0;
  });

  readonly lowStockProducts = computed(() =>
    this.courses()
      .flatMap(course => course.classes)
      .filter(courseClass => courseClass.availableSeats <= 5)
      .map(courseClass => ({
        id: courseClass.id,
        nome: `${courseClass.local} - ${courseClass.instructor}`,
        estoque: courseClass.availableSeats,
      }))
  );

  readonly revenueChart = computed<RevenueChartPoint[]>(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      date.setHours(0, 0, 0, 0);

      return date;
    });

    const values = days.map(day => {
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      const value = this.activeOrders()
        .filter(order => {
          const orderDate = new Date(order.dataPedido);
          return orderDate >= day && orderDate < nextDay;
        })
        .reduce((sum, order) => sum + order.total, 0);

      return {
        label: this.formatDayLabel(day),
        value,
      };
    });

    const maxValue = Math.max(...values.map(item => item.value), 1);

    return values.map(item => ({
      ...item,
      percent: Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0),
    }));
  });

  readonly statusChart = computed<StatusChartItem[]>(() => {
    const statuses = ['Pendente', 'Processando', 'Concluido', 'Cancelado'];
    const total = Math.max(this.orders().length, 1);

    return statuses.map(status => {
      const count = this.orders().filter(order => order.status === status).length;

      return {
        status,
        count,
        percent: (count / total) * 100,
      };
    });
  });

  readonly topProducts = computed<TopProductItem[]>(() => {
    const totals = new Map<string, { quantity: number; total: number }>();

    for (const order of this.activeOrders()) {
      for (const item of order.itens) {
        const current = totals.get(item.nome) ?? { quantity: 0, total: 0 };
        current.quantity += item.quantidade;
        current.total += item.quantidade * item.precoUnitario;
        totals.set(item.nome, current);
      }
    }

    const topItems = [...totals.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const maxTotal = Math.max(...topItems.map(item => item.total), 1);

    return topItems.map(item => ({
      ...item,
      percent: Math.max((item.total / maxTotal) * 100, 8),
    }));
  });

  constructor() {
    this.loadAdminData();
  }

  setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
  }

  setPeriod(period: Period): void {
    this.period.set(period);
  }

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  private formatDayLabel(date: Date): string {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
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

    this.loading.set(false);
  }

  saveProduct(): void {
    this.formError.set(null);
    this.success.set(null);

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.formError.set('Revise os dados do curso.');
      return;
    }

    const raw = this.productForm.getRawValue();
    const request: CourseRequest = {
      nome: raw.nome,
      description: raw.description,
      preco: Number(raw.preco),
      image: raw.image,
      category: raw.category,
      isActive: true,
    };
    const editingId = this.editingProductId();
    const action = editingId
      ? this.courseService.update(editingId, request)
      : this.courseService.create(request);

    this.savingProduct.set(true);

    action.pipe(finalize(() => this.savingProduct.set(false))).subscribe({
      next: course => {
        this.courses.update(courses => editingId
          ? courses.map(current => current.id === course.id ? course : current)
          : [course, ...courses]);
        this.resetProductForm();
        this.closeFormModal();
        this.success.set('Curso salvo com sucesso.');
      },
      error: response => this.formError.set(this.requestErrorMessage(
        response,
        'Nao foi possivel salvar o curso.',
      )),
    });
  }

  editProduct(course: Course): void {
    this.editingProductId.set(course.id);
    this.activeFormModal.set('course');
    this.productForm.setValue({
      nome: course.nome,
      preco: course.preco,
      tipoProduto: 'course',
      estoque: 0,
      description: course.description ?? '',
      image: course.image ?? '',
      category: course.category ?? '',
      date: '',
      location: '',
      instructor: '',
    });
  }

  resetProductForm(): void {
    this.editingProductId.set(null);
    this.productForm.reset({
      nome: '',
      preco: 0,
      tipoProduto: 'course',
      estoque: 0,
      description: '',
      image: '',
      category: '',
      date: '',
      location: '',
      instructor: '',
    });
  }

  openCourseModal(): void {
    this.formError.set(null);
    this.resetProductForm();
    this.activeFormModal.set('course');
  }

  openCouponModal(): void {
    this.formError.set(null);
    this.resetCouponForm();
    this.activeFormModal.set('coupon');
  }

  openClassForm(course: Course, courseClass?: CourseClass): void {
    this.formError.set(null);
    this.selectedCourse.set(course);
    this.editingClassId.set(courseClass?.id ?? null);
    this.activeFormModal.set('class');
    this.classForm.setValue({
      startDate: courseClass ? this.toDateTimeLocal(courseClass.startDate) : '',
      endDate: courseClass?.endDate ? this.toDateTimeLocal(courseClass.endDate) : '',
      local: courseClass?.local ?? '',
      instructor: courseClass?.instructor ?? '',
      capacity: courseClass?.capacity ?? 1,
      status: courseClass?.status ?? 'scheduled',
    });
  }

  saveClass(): void {
    this.formError.set(null);
    this.success.set(null);
    const course = this.selectedCourse();

    if (!course) {
      this.formError.set('Selecione um curso para cadastrar a turma.');
      return;
    }

    if (this.classForm.invalid) {
      this.classForm.markAllAsTouched();
      this.formError.set('Revise os dados da turma.');
      return;
    }

    const raw = this.classForm.getRawValue();
    const request: CourseClassRequest = {
      startDate: new Date(raw.startDate).toISOString(),
      endDate: raw.endDate ? new Date(raw.endDate).toISOString() : null,
      local: raw.local,
      instructor: raw.instructor,
      capacity: Number(raw.capacity),
      status: raw.status,
    };
    const editingId = this.editingClassId();
    const action = editingId
      ? this.courseService.updateClass(course.id, editingId, request)
      : this.courseService.createClass(course.id, request);

    action.subscribe({
      next: savedClass => {
        this.courses.update(courses => courses.map(current => {
          if (current.id !== course.id) {
            return current;
          }

          const classes = editingId
            ? current.classes.map(item => item.id === savedClass.id ? savedClass : item)
            : [...current.classes, savedClass];
          return { ...current, classes };
        }));
        this.closeFormModal();
        this.success.set('Turma salva com sucesso.');
      },
      error: response => this.formError.set(this.requestErrorMessage(
        response,
        'Nao foi possivel salvar a turma.',
      )),
    });
  }

  closeFormModal(): void {
    this.activeFormModal.set(null);
    this.editingClassId.set(null);
    this.formError.set(null);
  }

  editClass(course: Course, courseClass: CourseClass): void {
    this.openClassForm(course, courseClass);
  }

  private toDateTimeLocal(value: string): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  private requestErrorMessage(response: { status?: number; error?: { message?: string } }, fallback: string): string {
    if (response.error?.message) {
      return response.error.message;
    }

    if (response.status === 401) {
      return 'Sua sessao expirou ou nao possui autorizacao de administrador. Entre novamente.';
    }

    if (response.status === 403) {
      return 'Usuario autenticado sem permissao de administrador.';
    }

    return fallback;
  }

  saveCoupon(): void {
    this.formError.set(null);
    this.success.set(null);

    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      this.formError.set('Revise os dados do cupom.');
      return;
    }

    const raw = this.couponForm.getRawValue();
    const request: PromoCodeRequest = {
      ...raw,
      code: raw.code.toUpperCase(),
      discount: Number(raw.discount),
      usageLimit: raw.usageLimit === null ? null : Number(raw.usageLimit),
      usageCount: Number(raw.usageCount),
    };
    const editingId = this.editingCouponId();
    const action = editingId
      ? this.promoCodeService.update(editingId, request)
      : this.promoCodeService.create(request);

    this.savingCoupon.set(true);

    action.pipe(finalize(() => this.savingCoupon.set(false))).subscribe({
      next: coupon => {
        this.promoCodes.update(coupons => editingId
          ? coupons.map(current => current.id === coupon.id ? coupon : current)
          : [coupon, ...coupons]);
        this.resetCouponForm();
        this.closeFormModal();
        this.success.set('Cupom salvo com sucesso.');
      },
      error: response => this.formError.set(this.requestErrorMessage(
        response,
        'Nao foi possivel salvar o cupom.',
      )),
    });
  }

  editCoupon(coupon: PromoCode): void {
    this.editingCouponId.set(coupon.id);
    this.activeFormModal.set('coupon');
    this.couponForm.setValue({
      code: coupon.code,
      discount: coupon.discount,
      discountType: coupon.discountType,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      isActive: coupon.isActive,
      usageLimit: coupon.usageLimit ?? null,
      usageCount: coupon.usageCount,
    });
  }

  deleteCoupon(id: number): void {
    this.promoCodeService.delete(id).subscribe({
      next: () => {
        this.promoCodes.update(coupons => coupons.filter(coupon => coupon.id !== id));
        this.success.set('Cupom removido.');
      },
      error: () => this.error.set('Nao foi possivel remover o cupom.'),
    });
  }

  resetCouponForm(): void {
    this.editingCouponId.set(null);
    this.couponForm.reset({
      code: '',
      discount: 0,
      discountType: 'percentage',
      startDate: '',
      endDate: '',
      isActive: true,
      usageLimit: null,
      usageCount: 0,
    });
  }

  studentsForCourse(courseId: number): Student[] {
    return courseId === this.selectedCourse()?.id ? this.selectedStudents() : [];
  }

  openClassModal(course: Course, courseClass: CourseClass): void {
    this.selectedCourse.set(course);
    this.selectedClass.set(courseClass);
    this.selectedStudents.set([]);
    this.courseService.getClassStudents(course.id, courseClass.id).subscribe({
      next: students => this.selectedStudents.set(students),
      error: () => this.error.set('Nao foi possivel carregar os alunos da turma.'),
    });
  }

  closeClassModal(): void {
    this.selectedCourse.set(null);
    this.selectedClass.set(null);
    this.selectedStudents.set([]);
  }

  updateOrderStatus(order: Order, status: string): void {
    this.orderService.updateStatus(order.id, status).subscribe({
      next: response => {
        this.orders.update(orders => orders.map(current =>
          current.id === order.id ? { ...current, status: response.status } : current
        ));
        this.success.set('Status do pedido atualizado.');
      },
      error: () => this.error.set('Nao foi possivel atualizar o pedido.'),
    });
  }
}
