import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Note, NoteSchema } from './note.schema';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { PublicNotesController } from './public-notes.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Note.name, schema: NoteSchema }])],
  controllers: [NotesController, PublicNotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
