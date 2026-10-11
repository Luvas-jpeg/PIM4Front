import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing').then(m => m.Landing)
  },
  {
    path: 'catalogo',
    loadComponent: () => import('./features/home/home').then(m => m.Home)
  },
  {
    path: 'curso/:id',
    loadComponent: () => import('./features/course-detail/course-detail').then(m => m.CourseDetail)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: 'area-aluno',
    canActivate: [authGuard],
    loadComponent: () => import('./features/student/student').then(m => m.Student)
  },
  {
    path: 'area-aluno/matricula/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/enrollment-detail/enrollment-detail').then(m => m.EnrollmentDetail)
  },
  {
    path: 'conta',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account').then(m => m.Account)
  },
  {
    path: 'conta/pedido/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/order-detail/order-detail').then(m => m.OrderDetail)
  },
  {
    path: 'conta/matricula/:id',
    redirectTo: 'area-aluno/matricula/:id',
    pathMatch: 'full'
  },
  {
    path: 'carrinho',
    loadComponent: () => import('./features/cart/cart').then(m => m.Cart)
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () => import('./features/checkout/checkout').then(m => m.Checkout)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin').then(m => m.Admin)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
