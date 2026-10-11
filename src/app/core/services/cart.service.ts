import { Injectable, computed, signal } from '@angular/core';
import { Course, CourseClass } from '../models/course.models';

export interface CartItem {
  course: Course;
  quantity: number;
  courseClass?: CourseClass;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  static readonly maxCourseQuantity = 5;
  // Product IDs from old carts cannot safely be interpreted as course IDs.
  private readonly storageKey = 'pim4_courses_cart_v2';
  readonly items = signal<CartItem[]>(this.getStoredItems());
  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.course.preco * item.quantity, 0));
  readonly count = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0));

  add(course: Course, quantity = 1): void {
    this.addCourse(course, undefined, quantity);
  }

  addCourse(course: Course, courseClass?: CourseClass, quantity = 1): boolean {
    if (!course.isActive || !Number.isInteger(quantity) || quantity <= 0 ||
        !['presencial', 'ead'].includes(course.deliveryMode) ||
        (courseClass && (courseClass.courseId !== course.id || course.deliveryMode === 'ead'))) {
      return false;
    }
    const items = this.items();
    if (items.some(item => item.course.id === course.id && item.courseClass?.id !== courseClass?.id)) {
      return false;
    }
    const existing = items.find(item =>
      item.course.id === course.id && item.courseClass?.id === courseClass?.id);
    const nextQuantity = quantity + (existing?.quantity ?? 0);
    const maximum = Math.min(CartService.maxCourseQuantity,
      courseClass?.availableSeats ?? CartService.maxCourseQuantity);
    if (nextQuantity > maximum) return false;
    this.setItems(existing
      ? items.map(item => item === existing ? { ...item, quantity: nextQuantity } : item)
      : [...items, { course, courseClass, quantity }]);
    return true;
  }

  updateQuantity(item: CartItem, quantity: number): void {
    if (!Number.isInteger(quantity)) return;
    const maximum = Math.min(CartService.maxCourseQuantity,
      item.courseClass?.availableSeats ?? CartService.maxCourseQuantity);
    this.setItems(this.items()
      .map(current => current === item ? { ...current, quantity: Math.min(quantity, maximum) } : current)
      .filter(current => current.quantity > 0));
  }

  remove(item: CartItem): void {
    this.setItems(this.items().filter(current => current !== item));
  }

  clear(): void { this.setItems([]); }

  private setItems(items: CartItem[]): void {
    this.items.set(items);
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  private getStoredItems(): CartItem[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is CartItem =>
        !!item?.course && Number.isInteger(item.course.id) &&
        ['presencial', 'ead'].includes(item.course.deliveryMode) &&
        item.course.isActive === true &&
        Number.isInteger(item.quantity) && item.quantity > 0 &&
        item.quantity <= CartService.maxCourseQuantity &&
        (!item.courseClass || item.courseClass.courseId === item.course.id));
    } catch {
      return [];
    }
  }
}