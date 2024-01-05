import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CatsService } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';
import { Cat } from './schemas/cat.schema';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('cats')
@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  @ApiOperation({ summary: 'Create cat' })
  // @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(@Body() createCatDto: CreateCatDto) {
    await this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'The found record',
    type: Cat,
  })
  async findOne(@Param('id') id: string): Promise<Cat> {
    return this.catsService.findOne(id);
  }
  @Post(':id')
  @ApiOperation({ summary: 'Update cat' })
  @ApiResponse({ status: 200, description: 'The updated record', type: Cat })
  async update(
    @Param('id') id: string,
    @Body() updateCatDto: CreateCatDto,
  ): Promise<Cat> {
    return this.catsService.update(id, updateCatDto);
  }

  @Post('upsert')
  @ApiOperation({ summary: 'Upsert cat' })
  @ApiResponse({ status: 200, description: 'The upserted record', type: Cat })
  async upsert(
    @Body() filter: object,
    @Body() updateCatDto: CreateCatDto,
  ): Promise<Cat> {
    return this.catsService.upsert(filter, updateCatDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.catsService.delete(id);
  }
}
