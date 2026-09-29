import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { DocumentsModule } from './documents/documents.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    AiModule,
    DocumentsModule,
    ChatModule,
  ],
})
export class AppModule {}
