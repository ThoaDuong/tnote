import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { Note } from '../notes/note.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Note.name) private noteModel: Model<Note>,
  ) {}

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async createFromGoogle(profile: {
    googleId: string;
    email: string;
    displayName: string;
    avatar: string;
  }): Promise<User> {
    const existing = await this.findByGoogleId(profile.googleId);
    if (existing) {
      existing.email = profile.email;
      existing.displayName = profile.displayName;
      existing.avatar = profile.avatar;

      // Ensure existing user has a quick note (for users registered before this feature)
      if (!existing.quickNoteId) {
        const quickNote = await this.noteModel.create({
          title: 'Quick Note',
          type: 'text',
          textContent: '',
          userId: existing._id,
          isQuickNote: true,
          isPinned: true,
        });
        existing.quickNoteId = quickNote._id as any;
      }

      return existing.save();
    }

    // New user — create user first, then create their Quick Note
    const user = await this.userModel.create(profile);

    const quickNote = await this.noteModel.create({
      title: 'Quick Note',
      type: 'text',
      textContent: '',
      userId: user._id,
      isQuickNote: true,
      isPinned: true,
    });

    user.quickNoteId = quickNote._id as any;
    await user.save();

    return user;
  }

  async setQuickNote(userId: string, noteId: string): Promise<User> {
    // 1. Reset isQuickNote flag for all notes of this user
    await this.noteModel.updateMany({ userId }, { isQuickNote: false }).exec();

    // 2. Set isQuickNote=true for the new note
    await this.noteModel.findByIdAndUpdate(noteId, { isQuickNote: true, isPinned: true }).exec();

    // 3. Update user's pointer
    const user = await this.userModel
      .findByIdAndUpdate(userId, { quickNoteId: noteId }, { new: true })
      .exec();
    
    return user!;
  }
}
