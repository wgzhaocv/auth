import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const permissionData: Prisma.PermissionCreateInput[] = [
  {
    permission_id: 1,
    permission_name: "lookup",
    description: "lookup files",
  },
  {
    permission_id: 2,
    permission_name: "edit",
    description: "edit files",
  },
  {
    permission_id: 3,
    permission_name: "approve",
    description: "approve files",
  },
  {
    permission_id: 4,
    permission_name: "manage",
    description: "manage users",
  },
];

const roleData: Prisma.RolesCreateInput[] = [
  {
    role_id: 1,
    role_name: "juniorDev",
    description: "junior developer",
  },
  {
    role_id: 2,
    role_name: "seniorDev",
    description: "senior developer",
  },
  {
    role_id: 3,
    role_name: "manager",
    description: "manager",
  },
  {
    role_id: 4,
    role_name: "admin",
    description: "admin",
  },
];

const RolePermissionData: Prisma.Role_PermissionsCreateInput[] = [
  {
    role: {
      connect: { role_id: 1 },
    },
    permission: {
      connect: { permission_id: 1 },
    },
  },
  {
    role: {
      connect: { role_id: 2 },
    },
    permission: {
      connect: { permission_id: 1 },
    },
  },
  {
    role: {
      connect: { role_id: 2 },
    },
    permission: {
      connect: { permission_id: 2 },
    },
  },
  {
    role: {
      connect: { role_id: 3 },
    },
    permission: {
      connect: { permission_id: 1 },
    },
  },
  {
    role: {
      connect: { role_id: 3 },
    },
    permission: {
      connect: { permission_id: 2 },
    },
  },
  {
    role: {
      connect: { role_id: 3 },
    },
    permission: {
      connect: { permission_id: 3 },
    },
  },
  {
    role: {
      connect: { role_id: 4 },
    },
    permission: {
      connect: { permission_id: 1 },
    },
  },
  {
    role: {
      connect: { role_id: 4 },
    },
    permission: {
      connect: { permission_id: 2 },
    },
  },
  {
    role: {
      connect: { role_id: 4 },
    },
    permission: {
      connect: { permission_id: 3 },
    },
  },
  {
    role: {
      connect: { role_id: 4 },
    },
    permission: {
      connect: { permission_id: 4 },
    },
  },
];

async function seedingData() {
  console.log(`Start seeding ...`);
  await prisma.permission.createMany({
    data: permissionData,
    skipDuplicates: true,
  });
  await prisma.roles.createMany({
    data: roleData,
    skipDuplicates: true,
  });

  for (let role_Permissions of RolePermissionData) {
    await prisma.role_Permissions.create({
      data: role_Permissions,
    }); // create empty role_Permissions
  }

  console.log(`Seeding finished.`);
}

export default seedingData;
