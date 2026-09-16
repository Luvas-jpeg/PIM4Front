import { Component, Input, computed, signal } from '@angular/core';
import { Course } from '../../../../core/models/course.models';
import { Order } from '../../../../core/models/order.models';
import { Period } from '../../admin.types';

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

interface TopCourseItem {
  name: string;
  quantity: number;
  total: number;
  percent: number;
}

interface OccupancyReportItem {
  courseName: string;
  classId: number;
  label: string;
  occupied: number;
  capacity: number;
  percent: number;
}

interface CategoryReportItem {
  category: string;
  total: number;
  percent: number;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard {
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  private readonly coursesSignal = signal<Course[]>([]);
  readonly ordersSignal = signal<Order[]>([]);

  @Input()
  set courses(value: Course[]) {
    this.coursesSignal.set(value);
  }

  @Input()
  set orders(value: Order[]) {
    this.ordersSignal.set(value);
  }

  readonly period = signal<Period>('day');

  readonly activeOrders = computed(() =>
    this.ordersSignal().filter(order => order.status !== 'cancelled')
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

  readonly lowStockClasses = computed(() =>
    this.coursesSignal()
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
    const statuses = ['pending', 'processing', 'completed', 'cancelled'];
    const total = Math.max(this.ordersSignal().length, 1);

    return statuses.map(status => {
      const count = this.ordersSignal().filter(order => order.status === status).length;

      return {
        status: this.orderStatusLabel(status),
        count,
        percent: (count / total) * 100,
      };
    });
  });

  readonly topCourses = computed<TopCourseItem[]>(() => {
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

  readonly occupancyRate = computed(() => {
    const classes = this.coursesSignal().flatMap(course => course.classes);
    const capacity = classes.reduce((sum, courseClass) => sum + courseClass.capacity, 0);
    const occupied = classes.reduce(
      (sum, courseClass) => sum + courseClass.capacity - courseClass.availableSeats,
      0,
    );

    return capacity ? (occupied / capacity) * 100 : 0;
  });

  readonly cancellationRate = computed(() => {
    const orders = this.ordersSignal();
    const cancelled = orders.filter(order => order.status === 'cancelled').length;
    return orders.length ? (cancelled / orders.length) * 100 : 0;
  });

  readonly occupancyReport = computed<OccupancyReportItem[]>(() =>
    this.coursesSignal()
      .flatMap(course => course.classes.map(courseClass => {
        const occupied = Math.max(0, courseClass.capacity - courseClass.availableSeats);
        return {
          courseName: course.nome,
          classId: courseClass.id,
          label: `${courseClass.local} - ${this.formatShortDate(courseClass.startDate)}`,
          occupied,
          capacity: courseClass.capacity,
          percent: courseClass.capacity ? (occupied / courseClass.capacity) * 100 : 0,
        };
      }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 6)
  );

  readonly categoryReport = computed<CategoryReportItem[]>(() => {
    const totals = new Map<string, number>();

    for (const order of this.activeOrders()) {
      for (const item of order.itens) {
        const course = this.coursesSignal().find(current =>
          current.nome.toLowerCase() === item.nome.toLowerCase());
        const category = course?.category?.trim() || 'Sem categoria';
        totals.set(category, (totals.get(category) ?? 0) + item.quantidade * item.precoUnitario);
      }
    }

    const items = [...totals.entries()]
      .map(([category, total]) => ({ category, total, percent: 0 }))
      .sort((a, b) => b.total - a.total);
    const maxTotal = Math.max(...items.map(item => item.total), 1);

    return items.map(item => ({
      ...item,
      percent: Math.max((item.total / maxTotal) * 100, 8),
    }));
  });

  setPeriod(period: Period): void {
    this.period.set(period);
  }

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1).replace('.', ',')}%`;
  }

  orderStatusLabel(value: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      processing: 'Processando',
      completed: 'Concluido',
      cancelled: 'Cancelado',
    };

    return labels[value] ?? value;
  }

  exportReports(): void {
    const rows = [
      ['Relatorio', 'Indicador', 'Valor'],
      ['Resumo', 'Taxa de ocupacao', this.formatPercent(this.occupancyRate())],
      ['Resumo', 'Taxa de cancelamento', this.formatPercent(this.cancellationRate())],
      ...this.occupancyReport().map(item => [
        'Ocupacao por turma',
        `${item.courseName} - ${item.label}`,
        `${item.occupied}/${item.capacity} (${this.formatPercent(item.percent)})`,
      ]),
      ...this.categoryReport().map(item => [
        'Receita por categoria',
        item.category,
        this.formatPrice(item.total),
      ]),
    ];
    const csv = rows
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `relatorio-administrativo-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private formatDayLabel(date: Date): string {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  private formatShortDate(value: string): string {
    return new Date(value).toLocaleDateString('pt-BR');
  }
}
