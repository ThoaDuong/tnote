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
      return existing.save();
    }

    // New user — create user first, then create their initial note
    const user = await this.userModel.create(profile);

    await this.noteModel.create({
      title: 'Quick Note',
      type: 'text',
      textContent: '',
      userId: user._id,
    });

    return user;
  }
}
