import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContactsService } from './contacts.service';

@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private contacts: ContactsService) {}

  @Get()
  list(@Req() req: { user?: { userId: string } }) {
    if (!req.user?.userId) throw new UnauthorizedException();
    return this.contacts.listContacts(req.user.userId);
  }

  @Post()
  add(
    @Req() req: { user?: { userId: string } },
    @Body() body: { contactUserId: string; savedName: string; notes?: string },
  ) {
    if (!req.user?.userId) throw new UnauthorizedException();
    return this.contacts.addContact(req.user.userId, body);
  }

  @Patch(':contactUserId')
  update(
    @Param('contactUserId') contactUserId: string,
    @Req() req: { user?: { userId: string } },
    @Body() body: { savedName?: string; notes?: string },
  ) {
    if (!req.user?.userId) throw new UnauthorizedException();
    return this.contacts.updateContact(req.user.userId, contactUserId, body);
  }

  @Delete(':contactUserId')
  remove(@Param('contactUserId') contactUserId: string, @Req() req: { user?: { userId: string } }) {
    if (!req.user?.userId) throw new UnauthorizedException();
    return this.contacts.removeContact(req.user.userId, contactUserId);
  }
}
