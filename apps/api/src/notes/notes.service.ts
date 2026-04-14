import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note } from './note.schema';
import { User } from '../users/user.schema';
import { NoteType } from '@note-app/shared';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name) private noteModel: Model<Note>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async findAllByUser(
    userId: string,
    options?: { folderId?: string; search?: string; type?: NoteType; limit?: number },
  ): Promise<Note[]> {
    const query: any = { userId };

    if (options?.folderId) {
      query.folderId = options.folderId;
    }

    if (options?.search) {
      query.title = { $regex: options.search, $options: 'i' };
    }

    if (options?.type) {
      query.type = options.type;
    }

    let queryBuilder = this.noteModel
      .find(query)
      .select('-strokes')
      .sort({ isPinned: -1, updatedAt: -1 }); // pinned notes first

    if (options?.limit) {
      queryBuilder = queryBuilder.limit(Number(options.limit));
    }

    return queryBuilder.exec();
  }

  async findById(id: string, userId: string): Promise<Note> {
    const note = await this.noteModel.findOne({ _id: id, userId }).exec();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async findPublicById(id: string): Promise<Note> {
    const note = await this.noteModel.findOne({ _id: id, isPublic: true }).exec();
    if (!note) throw new NotFoundException('Note is not public or not found');
    return note;
  }

  /**
   * Find the user's quick note.
   * Primary: find note with isQuickNote=true (source of truth).
   * Fallback: use user.quickNoteId if flag not found.
   * Each account has exactly 1 quick note at any time.
   */
  async findQuickNote(userId: string): Promise<Note> {
    // Primary: find by isQuickNote flag on note
    const note = await this.noteModel.findOne({ userId, isQuickNote: true }).exec();
    if (note) {
      // Sync quickNoteId on user if out of date
      const user = await this.userModel.findById(userId).exec();
      if (user && (!user.quickNoteId || user.quickNoteId.toString() !== note._id.toString())) {
        await this.userModel.findByIdAndUpdate(userId, { quickNoteId: note._id }).exec();
      }
      return note;
    }

    // Fallback: lookup by user.quickNoteId
    const user = await this.userModel.findById(userId).exec();
    if (user?.quickNoteId) {
      const fallbackNote = await this.noteModel.findOne({ _id: user.quickNoteId, userId }).exec();
      if (fallbackNote) return fallbackNote;
    }

    throw new NotFoundException('Quick note not found');
  }

  async create(userId: string, data: any): Promise<Note> {
    return this.noteModel.create({ ...data, userId });
  }

  async update(id: string, userId: string, data: any): Promise<Note> {
    const note = await this.noteModel
      .findOneAndUpdate({ _id: id, userId }, data, { new: true })
      .exec();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async delete(id: string, userId: string): Promise<void> {
    const note = await this.noteModel.findOne({ _id: id, userId }).exec();
    if (!note) throw new NotFoundException('Note not found');

    if (note.isQuickNote) {
      throw new BadRequestException('This note is your Quick Note and cannot be deleted.');
    }

    await this.noteModel.deleteOne({ _id: id, userId }).exec();
  }

  async deleteByFolder(folderId: string, userId: string): Promise<void> {
    await this.noteModel.deleteMany({ folderId, userId }).exec();
  }
}
