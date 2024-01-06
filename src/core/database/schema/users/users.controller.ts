import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.schema';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserDto } from './dto/user.dto';
import { UserUpdateDto } from './dto/user-update.dto';

function skellyTestUser() {
  return {
    name: 'Skelly FreeMoCap',
    discordId: '1186697433674166293',
    metadata: {
      type: 'skelly',
      email: 'info@freemocap.org',
      things: ['thing1', 'thing2'],
      stuff: { stuff1: 'stuff1', stuff2: 'stuff2' },
    },
  };
}

@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a user' })
  @ApiBody({
    type: UserDto,
    schema: {
      example: skellyTestUser(),
    },
  })
  @ApiResponse({
    status: 200,
    description: 'The created record',
    type: User,
  })
  async create(@Body() createUserDto: UserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'The found records',
    type: User,
    isArray: true,
  })
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    description: 'The found record',
    type: User,
  })
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by id' })
  @ApiBody({ type: UserUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'The updated record',
    type: User,
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UserUpdateDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'The deleted record',
    type: User,
  })
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
