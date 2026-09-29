import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { AiModule } from '../ai/ai.module';

@Module({ imports: [AiModule], controllers: [DocumentsController], providers: [DocumentsService] })
export class DocumentsModule {}
