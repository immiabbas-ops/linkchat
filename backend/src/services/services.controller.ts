import { Controller, Get, Post, Delete, Body, Query, UseGuards, Req, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsInt, Min, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class TaxiDto {
  @IsString()
  pickup: string;

  @IsString()
  dropoff: string;

  @IsOptional()
  @Type(() => Number)
  fare?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

class TripDto {
  @IsString()
  destination: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  fromCity?: string;

  @IsOptional()
  @IsString()
  toCity?: string;

  @IsOptional()
  @IsString()
  departDate?: string;

  @IsOptional()
  @IsString()
  returnDate?: string;

  @IsOptional()
  @IsString()
  checkIn?: string;

  @IsOptional()
  @IsString()
  checkOut?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  travelers?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class NearbyQueryDto {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radius?: number;

  @IsOptional()
  @IsString()
  filter?: string;
}

@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(private services: ServicesService) {}

  @Get('taxi')
  getTaxi(@Req() req: { user: { userId: string } }) {
    return this.services.getTaxiBookings(req.user.userId);
  }

  @Post('taxi')
  bookTaxi(@Req() req: { user: { userId: string } }, @Body() dto: TaxiDto) {
    return this.services.createTaxiBooking(req.user.userId, dto);
  }

  @Get('trips/attractions')
  getAttractions(@Query('city') city: string) {
    return this.services.getTripAttractions(city || '');
  }

  @Get('trips')
  getTrips(@Req() req: { user: { userId: string } }) {
    return this.services.getTrips(req.user.userId);
  }

  @Post('trips')
  createTrip(@Req() req: { user: { userId: string } }, @Body() dto: TripDto) {
    return this.services.createTrip(req.user.userId, dto);
  }

  @Delete('trips/:id')
  deleteTrip(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.services.deleteTrip(req.user.userId, id);
  }

  @Get('jobs/live')
  getLiveJobs(@Query('q') q?: string, @Query('category') category?: string) {
    return this.services.getLiveJobs(q, category);
  }

  @Get('jobs')
  getJobs() {
    return this.services.getJobs();
  }

  @Get('food/nearby')
  getNearbyFood(@Query() query: NearbyQueryDto) {
    return this.services.getNearbyFood(query.lat, query.lng, query.radius, query.filter);
  }

  @Get('food')
  getFood(@Query('category') category?: string) {
    return this.services.getFoodItems(category);
  }

  @Get('realestate/nearby')
  getNearbyRealEstate(@Query() query: NearbyQueryDto) {
    return this.services.getNearbyRealEstateOffices(query.lat, query.lng, query.radius);
  }

  @Get('realestate')
  getRealEstate() {
    return this.services.getRealEstate();
  }

  @Get('news/live')
  getLiveNews(@Query('category') category?: string) {
    return this.services.getLiveNews(category);
  }

  @Get('news')
  getNews(@Query('category') category?: string) {
    return this.services.getNews(category);
  }
}
