import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Folder } from './folder.schema';

@Injectable()
export class FoldersService {
  constructor(@InjectModel(Folder.name) private folderModel: Model<Folder>) {}

  async findAllByUser(userId: string): Promise<Folder[]> {
    return this.folderModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string, userId: string): Promise<Folder> {
    const folder = await this.folderModel.findOne({ _id: id, userId }).exec();
    if (!folder) throw new NotFoundException('Folder not found');
    return folder;
  }

  async create(userId: string, data: { name: string; color?: string }): Promise<Folder> {
    return this.folderModel.create({ ...data, userId });
  }

  async update(id: string, userId: string, data: { name?: string; color?: string }): Promise<Folder> {
    const folder = await this.folderModel
      .findOneAndUpdate({ _id: id, userId }, data, { new: true })
      .exec();
    if (!folder) throw new NotFoundException('Folder not found');
    return folder;
  }

  async delete(id: string, userId: string): Promise<void> {
    const result = await this.folderModel.deleteOne({ _id: id, userId }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('Folder not found');
  }
}
