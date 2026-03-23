import { Controller, Get, Param } from '@nestjs/common';
import { NotesService } from './notes.service';

@Controller('public/notes')
export class PublicNotesController {
  constructor(private notesService: NotesService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notesService.findPublicById(id);
  }
}
