import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CatsService } from './cats.service';
import { CreateCatDto } from './create-cat.dto';
import { Cat } from './cat.schema';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('cats')
@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post('upsert')
  @ApiOperation({ summary: 'Upsert cat' })
  @ApiBody({ type: CreateCatDto })
  @ApiResponse({ status: 200, description: 'The upserted record', type: Cat })
  async upsert(@Body() createCatDto: CreateCatDto): Promise<Cat> {
    //upsert - creates new record if no record found
    const filter = { name: createCatDto.name };
    return this.catsService.upsert(filter, createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
  @Get(':name')
  @ApiResponse({
    status: 200,
    description: 'The found record',
    type: Cat,
  })
  async findOne(@Param('name') name: string): Promise<Cat> {
    return this.catsService.findOne(name);
  }

  @Delete(':name')
  async delete(@Param('name') name: string) {
    return this.catsService.delete(name);
  }
}
