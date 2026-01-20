import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MulterModule } from '@nestjs/platform-express';
import { CapacityEngineService } from './capacity-engine.service'; // 1. IMPORTAR

@Module({
  imports: [MulterModule.register()],
  controllers: [AppController],
  providers: [
    AppService, 
    CapacityEngineService // 2. AGREGAR AQUÍ
  ],
})
export class AppModule {}
