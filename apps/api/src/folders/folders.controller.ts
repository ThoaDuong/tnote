import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guards';
import { FoldersService } from './folders.service';

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private foldersService: FoldersService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.foldersService.findAllByUser(req.user._id);
  }

  @Post()
  create(@Req() req: any, @Body() body: { name: string; color?: string }) {
    return this.foldersService.create(req.user._id, body);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { name?: string; color?: string },
  ) {
    return this.foldersService.update(id, req.user._id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.foldersService.delete(id, req.user._id);
  }
}
