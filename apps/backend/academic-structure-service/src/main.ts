import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 1. Agrega esta línea para permitir que el Front se conecte
  app.enableCors(); 
  
  // 2. Asegúrate de que el prefijo coincida con tu fetch
  app.setGlobalPrefix('api'); 

  await app.listen(3001); // Puerto del microservicio
}
bootstrap();
