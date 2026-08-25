import { Component, inject } from '@angular/core';
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

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}
