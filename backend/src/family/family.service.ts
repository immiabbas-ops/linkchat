import { Injectable, ForbiddenException } from '@nestjs/common';
import { FamilyRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

  async getFamilyGroup(userId: string) {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      include: {
        familyGroup: {
          include: {
            members: { include: { user: { include: { profile: true } } } },
            children: true,
          },
        },
      },
    });

    if (!membership) {
      const owned = await this.prisma.familyGroup.findFirst({
        where: { ownerId: userId },
        include: {
          members: { include: { user: { include: { profile: true } } } },
          children: true,
        },
      });
      return owned;
    }

    return membership.familyGroup;
  }

  async createFamilyGroup(userId: string, name: string) {
    return this.prisma.familyGroup.create({
      data: {
        name,
        ownerId: userId,
        members: { create: { userId, role: FamilyRole.OWNER } },
      },
      include: { members: true, children: true },
    });
  }

  async addSpouse(userId: string, spouseEmail: string) {
    const group = await this.ensureOwner(userId);
    const spouse = await this.prisma.user.findUnique({ where: { email: spouseEmail.toLowerCase() } });
    if (!spouse) throw new ForbiddenException('User not found');

    return this.prisma.familyMember.create({
      data: {
        familyGroupId: group.id,
        userId: spouse.id,
        role: FamilyRole.SPOUSE,
        permissions: { chat: true, services: true, screenTime: false },
      },
    });
  }

  async addChildProfile(
    userId: string,
    data: { displayName: string; age?: number; email?: string },
  ) {
    const group = await this.ensureOwner(userId);

    let childUser = data.email
      ? await this.prisma.user.findUnique({ where: { email: data.email.toLowerCase() } })
      : null;

    if (!childUser && data.email) {
      childUser = await this.prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          role: 'CHILD',
          profile: { create: { displayName: data.displayName } },
        },
      });
    }

    if (!childUser) {
      throw new ForbiddenException('Child email required to create profile');
    }

    return this.prisma.childProfile.create({
      data: {
        userId: childUser.id,
        familyGroupId: group.id,
        displayName: data.displayName,
        age: data.age,
        restrictedMode: true,
        approvedContacts: [],
      },
    });
  }

  async updateChildPermissions(
    userId: string,
    childId: string,
    data: { screenTimeLimit?: number; approvedContacts?: string[]; restrictedMode?: boolean },
  ) {
    await this.ensureOwner(userId);
    return this.prisma.childProfile.update({
      where: { id: childId },
      data,
    });
  }

  private async ensureOwner(userId: string) {
    const group = await this.prisma.familyGroup.findFirst({ where: { ownerId: userId } });
    if (!group) throw new ForbiddenException('Family group not found or not owner');
    return group;
  }
}
