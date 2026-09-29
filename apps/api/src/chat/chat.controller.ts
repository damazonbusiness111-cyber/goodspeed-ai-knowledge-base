import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  ask(@Req() req: any, @Body() body: { question: string; conversationId?: string }) {
    return this.chat.ask(req.user.id, req.accessToken, body.question, body.conversationId);
  }

  @Get('conversations')
  conversations(@Req() req: any) {
    return this.chat.listConversations(req.accessToken);
  }

  @Get('conversations/:id/messages')
  messages(@Req() req: any, @Param('id') id: string) {
    return this.chat.listMessages(req.accessToken, id);
  }
}
