import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guards';
import { NotesService } from './notes.service';
import { NoteType } from '@note-app/shared';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private notesService: NotesService) {}

  @Get('quick')
  async getQuickNote(@Req() req: any) {
    const user = req.user;
    if (!user.quickNoteId) {
      throw new NotFoundException('No quick note set for this user');
    }
    return this.notesService.findQuickNote(user._id.toString(), user.quickNoteId.toString());
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('folderId') folderId?: string,
    @Query('search') search?: string,
    @Query('type') type?: NoteType,
    @Query('limit') limit?: number,
  ) {
    return this.notesService.findAllByUser(req.user._id, { folderId, search, type, limit });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.notesService.findById(id, req.user._id);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.notesService.create(req.user._id, body);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.notesService.update(id, req.user._id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.notesService.delete(id, req.user._id);
  }
}
