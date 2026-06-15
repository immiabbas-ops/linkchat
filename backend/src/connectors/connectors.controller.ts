import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectorsService } from './connectors.service';
import { CreateConnectorDto } from './dto/connector.dto';

@ApiTags('connectors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('connectors')
export class ConnectorsController {
  constructor(private connectors: ConnectorsService) {}

  @Get()
  list(@Req() req: { user: { userId: string } }) {
    return this.connectors.getUserConnectors(req.user.userId);
  }

  @Post()
  create(@Req() req: { user: { userId: string } }, @Body() dto: CreateConnectorDto) {
    return this.connectors.createConnector(req.user.userId, dto);
  }

  @Delete(':id')
  remove(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.connectors.deleteConnector(req.user.userId, id);
  }
}
