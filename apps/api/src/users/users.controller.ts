import { Controller, Patch, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guards';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Patch('quick-note')
  async setQuickNote(@Req() req: any, @Body() body: { noteId: string }) {
    if (!body.noteId) {
      throw new BadRequestException('noteId is required');
    }
    return this.usersService.setQuickNote(req.user._id.toString(), body.noteId);
  }
}
