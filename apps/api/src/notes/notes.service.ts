import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findQuickNote(userId: string, quickNoteId: string): Promise<Note> {
    const note = await this.noteModel.findOne({ _id: quickNoteId, userId }).exec();
    if (!note) throw new NotFoundException('Quick note not found');
    return note;
  }

  /**
   * Find the user's quick note. If quickNoteId is not set but a note with
   * isQuickNote=true exists, auto-assign it and clean up duplicates.
   */
  async findOrAssignQuickNote(userId: string): Promise<Note | null> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return null;

    // If user already has quickNoteId set, return that note
    if (user.quickNoteId) {
      const note = await this.noteModel.findOne({ _id: user.quickNoteId, userId }).exec();
      if (note) return note;
      // quickNoteId points to a deleted note — fall through to auto-detect
    }

    // Auto-detect: find notes with isQuickNote=true for this user
    const quickNotes = await this.noteModel
      .find({ userId, isQuickNote: true })
      .sort({ createdAt: 1 })
      .exec();

    let keepNote;

    if (quickNotes.length === 0) {
      // Create a default quick note if none exists
      keepNote = await this.noteModel.create({
        title: 'Quick Note',
        type: 'text',
        textContent: '',
        userId,
        isQuickNote: true,
        isPinned: true,
      });
    } else {
      // Keep the oldest, delete duplicates
      keepNote = quickNotes[0];
      if (quickNotes.length > 1) {
        const deleteIds = quickNotes.slice(1).map(n => n._id);
        await this.noteModel.deleteMany({ _id: { $in: deleteIds } }).exec();
      }
    }

    // Assign to user
    await this.userModel.findByIdAndUpdate(userId, { quickNoteId: keepNote._id }).exec();

    return keepNote;
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
    const result = await this.noteModel.deleteOne({ _id: id, userId }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('Note not found');
  }

  async deleteByFolder(folderId: string, userId: string): Promise<void> {
    await this.noteModel.deleteMany({ folderId, userId }).exec();
  }

  async cleanupDuplicateQuickNotes(userId: string): Promise<{ kept: string; deleted: number }> {
    const quickNotes = await this.noteModel
      .find({ userId, isQuickNote: true })
      .sort({ createdAt: 1 })
      .exec();

    if (quickNotes.length <= 1) {
      return { kept: quickNotes[0]?._id?.toString() || 'none', deleted: 0 };
    }

    // Keep the first (oldest), delete the rest
    const keepId = quickNotes[0]._id;
    const deleteIds = quickNotes.slice(1).map(n => n._id);

    const result = await this.noteModel.deleteMany({ _id: { $in: deleteIds } }).exec();

    return { kept: keepId.toString(), deleted: result.deletedCount };
  }
}
