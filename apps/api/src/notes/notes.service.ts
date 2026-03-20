import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note } from './note.schema';

@Injectable()
export class NotesService {
  constructor(@InjectModel(Note.name) private noteModel: Model<Note>) {}

  async findAllByUser(
    userId: string,
    options?: { folderId?: string; search?: string },
  ): Promise<Note[]> {
    const query: any = { userId };

    if (options?.folderId) {
      query.folderId = options.folderId;
    }

    if (options?.search) {
      query.title = { $regex: options.search, $options: 'i' };
    }

    // Exclude strokes from list queries for performance
    return this.noteModel
      .find(query)
      .select('-strokes')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(id: string, userId: string): Promise<Note> {
    const note = await this.noteModel.findOne({ _id: id, userId }).exec();
    if (!note) throw new NotFoundException('Note not found');
    return note;
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
}
