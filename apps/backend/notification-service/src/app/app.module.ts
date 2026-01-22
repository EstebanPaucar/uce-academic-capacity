import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({ secret: 'SECRET_KEY_UCE_2026', signOptions: { expiresIn: '1h' }, }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}