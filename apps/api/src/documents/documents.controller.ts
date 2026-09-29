import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { DocumentsService } from './documents.service';

@Controller('documents')
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@Req() req: any) {
    return this.documents.list(req.accessToken);
  }

  @Post()
  create(@Req() req: any, @Body() body: { title: string; content: string; tags?: string[] }) {
    return this.documents.create(req.user.id, req.accessToken, body);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: { title?: string; content?: string; tags?: string[] }) {
    return this.documents.update(req.user.id, req.accessToken, id, body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.documents.remove(req.accessToken, id);
  }
}
