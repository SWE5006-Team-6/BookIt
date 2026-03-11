import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.listUsers();
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: User,
  ) {
    return this.usersService.updateUser(id, dto, actor.id);
  }
}

