import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './app.service';

@Controller('auth')
export class AppController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() userData: any) {
    return this.authService.register(userData);
  }

  @Post('login')
  async login(@Body() credentials: any) {
    return this.authService.login(credentials.email, credentials.password);
  }
}