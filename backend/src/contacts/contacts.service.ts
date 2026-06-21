import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatPhoneDisplay as formatPhoneInternational, normalizePhoneToE164Digits } from '../common/phone.util';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  normalizePhone(phone: string) {
    return normalizePhoneToE164Digits(phone);
  }

  async listContacts(userId: string) {
    return this.prisma.contact.findMany({
      where: { userId },
      orderBy: { savedName: 'asc' },
    });
  }

  async getContactMap(userId: string) {
    const contacts = await this.listContacts(userId);
    return Object.fromEntries(contacts.map((c) => [c.contactUserId, c]));
  }

  async addContact(
    userId: string,
    data: { contactUserId: string; savedName: string; notes?: string },
  ) {
    if (userId === data.contactUserId) {
      throw new BadRequestException('Cannot add yourself as a contact');
    }

    const savedName = data.savedName.trim();
    if (!savedName) {
      throw new BadRequestException('Contact name is required');
    }

    const other = await this.prisma.user.findUnique({
      where: { id: data.contactUserId },
      include: { profile: true },
    });
    if (!other?.profile?.phone) {
      throw new NotFoundException('User not found');
    }

    const phone = this.normalizePhone(other.profile.phone);

    const existing = await this.prisma.contact.findUnique({
      where: { userId_contactUserId: { userId, contactUserId: data.contactUserId } },
    });
    if (existing) {
      throw new ConflictException('Contact already exists');
    }

    return this.prisma.contact.create({
      data: {
        userId,
        contactUserId: data.contactUserId,
        savedName,
        phone,
        notes: data.notes?.trim() || null,
      },
    });
  }

  async updateContact(
    userId: string,
    contactUserId: string,
    data: { savedName?: string; notes?: string },
  ) {
    const contact = await this.prisma.contact.findUnique({
      where: { userId_contactUserId: { userId, contactUserId } },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    const savedName = data.savedName?.trim();
    if (savedName !== undefined && !savedName) {
      throw new BadRequestException('Contact name is required');
    }

    return this.prisma.contact.update({
      where: { id: contact.id },
      data: {
        ...(savedName !== undefined ? { savedName } : {}),
        ...(data.notes !== undefined ? { notes: data.notes.trim() || null } : {}),
      },
    });
  }

  async removeContact(userId: string, contactUserId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { userId_contactUserId: { userId, contactUserId } },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    await this.prisma.contact.delete({ where: { id: contact.id } });
    return { removed: true };
  }

  formatPhoneDisplay(phone?: string | null) {
    return formatPhoneInternational(phone);
  }
}
