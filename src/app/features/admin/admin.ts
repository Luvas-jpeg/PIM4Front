import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Order } from '../../core/models/order.models';
import { Product, ProductRequest } from '../../core/models/product.models';
import { PromoCode, PromoCodeRequest } from '../../core/models/promo-codes.models';
import { Student, StudentRequest } from '../../core/models/student.models';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { PromoCodeService } from '../../core/services/promo-code.service';
import { StudentService } from '../../core/services/student.service';

type AdminTab = 'dashboard' | 'products' | 'classes' | 'coupons' | 'orders';
type Period = 'day' | 'week' | 'month' | 'year';
type ProductType = 'equipment' | 'course';
type DiscountType = 'percentage' | 'fixed';
type StudentStatus = 'active' | 'completed' | 'cancelled';

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
  imports: [ReactiveFormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly promoCodeService = inject(PromoCodeService);
  private readonly studentService = inject(StudentService);
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  readonly activeTab = signal<AdminTab>('dashboard');
  readonly period = signal<Period>('day');
  readonly products = signal<Product[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly promoCodes = signal<PromoCode[]>([]);
  readonly students = signal<Student[]>([]);
  readonly loading = signal(false);
  readonly savingProduct = signal(false);
  readonly savingCoupon = signal(false);
  readonly savingStudent = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly editingProductId = signal<number | null>(null);
  readonly editingCouponId = signal<number | null>(null);
  readonly editingStudentId = signal<number | null>(null);

  readonly productForm = this.formBuilder.group({
    nome: this.formBuilder.control('', [Validators.required]),
    preco: this.formBuilder.control(0, [Validators.required, Validators.min(0.01)]),
    tipoProduto: this.formBuilder.control<ProductType>('equipment', [Validators.required]),
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

  readonly studentForm = this.formBuilder.group({
    name: this.formBuilder.control('', [Validators.required]),
    email: this.formBuilder.control('', [Validators.required, Validators.email]),
    phone: this.formBuilder.control(''),
    courseId: this.formBuilder.control('', [Validators.required]),
    courseName: this.formBuilder.control('', [Validators.required]),
    enrollmentDate: this.formBuilder.control(new Date().toISOString().slice(0, 10)),
    status: this.formBuilder.control<StudentStatus>('active', [Validators.required]),
  });

  readonly courses = computed(() =>
    this.products().filter(product => product.tipoProduto === 'course')
  );

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
    this.products().filter(product => product.estoque <= 5)
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

    this.productService.getAll().subscribe({
      next: products => this.products.set(products),
      error: () => this.error.set('Nao foi possivel carregar produtos.'),
    });

    this.orderService.getAll().subscribe({
      next: orders => this.orders.set(orders),
      error: () => this.error.set('Nao foi possivel carregar pedidos.'),
    });

    this.promoCodeService.getAll().subscribe({
      next: promoCodes => this.promoCodes.set(promoCodes),
      error: () => this.error.set('Nao foi possivel carregar cupons.'),
    });

    this.studentService.getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: students => this.students.set(students),
        error: () => this.error.set('Nao foi possivel carregar turmas.'),
      });
  }

  saveProduct(): void {
    this.error.set(null);
    this.success.set(null);

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.error.set('Revise os dados do produto.');
      return;
    }

    const raw = this.productForm.getRawValue();
    const request: ProductRequest = {
      ...raw,
      preco: Number(raw.preco),
      estoque: Number(raw.estoque),
    };
    const editingId = this.editingProductId();
    const action = editingId
      ? this.productService.update(editingId, request)
      : this.productService.create(request);

    this.savingProduct.set(true);

    action.pipe(finalize(() => this.savingProduct.set(false))).subscribe({
      next: product => {
        this.products.update(products => editingId
          ? products.map(current => current.id === product.id ? product : current)
          : [product, ...products]);
        this.resetProductForm();
        this.success.set('Produto salvo com sucesso.');
      },
      error: response => this.error.set(response.error?.message ?? 'Nao foi possivel salvar o produto.'),
    });
  }

  editProduct(product: Product): void {
    this.editingProductId.set(product.id);
    this.productForm.setValue({
      nome: product.nome,
      preco: product.preco,
      tipoProduto: product.tipoProduto,
      estoque: product.estoque,
      description: product.description ?? '',
      image: product.image ?? '',
      category: product.category ?? '',
      date: product.date ?? '',
      location: product.location ?? '',
      instructor: product.instructor ?? '',
    });
  }

  deleteProduct(id: number): void {
    this.productService.delete(id).subscribe({
      next: () => {
        this.products.update(products => products.filter(product => product.id !== id));
        this.success.set('Produto removido.');
      },
      error: () => this.error.set('Nao foi possivel remover o produto.'),
    });
  }

  resetProductForm(): void {
    this.editingProductId.set(null);
    this.productForm.reset({
      nome: '',
      preco: 0,
      tipoProduto: 'equipment',
      estoque: 0,
      description: '',
      image: '',
      category: '',
      date: '',
      location: '',
      instructor: '',
    });
  }

  saveCoupon(): void {
    this.error.set(null);
    this.success.set(null);

    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      this.error.set('Revise os dados do cupom.');
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
        this.success.set('Cupom salvo com sucesso.');
      },
      error: response => this.error.set(response.error?.message ?? 'Nao foi possivel salvar o cupom.'),
    });
  }

  editCoupon(coupon: PromoCode): void {
    this.editingCouponId.set(coupon.id);
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

  saveStudent(): void {
    this.error.set(null);
    this.success.set(null);

    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      this.error.set('Revise os dados da turma.');
      return;
    }

    const request: StudentRequest = this.studentForm.getRawValue();
    const editingId = this.editingStudentId();
    const action = editingId
      ? this.studentService.update(editingId, request)
      : this.studentService.create(request);

    this.savingStudent.set(true);

    action.pipe(finalize(() => this.savingStudent.set(false))).subscribe({
      next: student => {
        this.students.update(students => editingId
          ? students.map(current => current.id === student.id ? student : current)
          : [student, ...students]);
        this.resetStudentForm();
        this.success.set('Turma atualizada com sucesso.');
      },
      error: response => this.error.set(response.error?.message ?? 'Nao foi possivel salvar a turma.'),
    });
  }

  editStudent(student: Student): void {
    this.editingStudentId.set(student.id);
    this.studentForm.setValue({
      name: student.name,
      email: student.email,
      phone: student.phone,
      courseId: student.courseId,
      courseName: student.courseName,
      enrollmentDate: student.enrollmentDate,
      status: student.status,
    });
  }

  deleteStudent(id: number): void {
    this.studentService.delete(id).subscribe({
      next: () => {
        this.students.update(students => students.filter(student => student.id !== id));
        this.success.set('Registro removido.');
      },
      error: () => this.error.set('Nao foi possivel remover o registro.'),
    });
  }

  selectCourse(courseId: string): void {
    const course = this.courses().find(product => String(product.id) === courseId);

    if (!course) {
      return;
    }

    this.studentForm.patchValue({
      courseId: String(course.id),
      courseName: course.nome,
    });
  }

  resetStudentForm(): void {
    this.editingStudentId.set(null);
    this.studentForm.reset({
      name: '',
      email: '',
      phone: '',
      courseId: '',
      courseName: '',
      enrollmentDate: new Date().toISOString().slice(0, 10),
      status: 'active',
    });
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
