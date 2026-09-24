import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CartService } from './core/services/cart.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);

  readonly cartCount = this.cartService.count;
  readonly user = this.authService.user;
  readonly isHeaderHidden = signal(false);

  private lastScrollY = 0;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const currentScrollY = window.scrollY;

    if (currentScrollY <= 24) {
      this.isHeaderHidden.set(false);
    } else {
      this.isHeaderHidden.set(currentScrollY > this.lastScrollY);
    }

    this.lastScrollY = currentScrollY;
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent): void {
    if (event.clientY <= 18 && this.isHeaderHidden()) {
      this.isHeaderHidden.set(false);
    }
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}
