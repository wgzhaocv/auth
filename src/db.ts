import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

enum QueryType {
  BY_ID = 0,
  BY_EMAIL = 1,
  BY_PHONE_NUMBER = 2,
}

const queryUser = (type: QueryType) => {
  return async (param: string | number) => {
    let where:
      | { user_id: number }
      | { email: string }
      | { phonenumber: string };

    if (typeof param === "string") {
      if (type === 1) {
        where = { email: param };
      } else {
        where = {
          phonenumber: param,
        };
      }
    } else {
      where = {
        user_id: param,
      };
    }

    const user = await prisma.user.findUnique({
      where,
      select: {
        User_Roles: {
          select: {
            role: {
              select: {
                role_id: true,
                role_name: true,
                Role_Permissions: {
                  select: {
                    permission: {
                      select: {
                        permission_id: true,
                        permission_name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    return user;
  };
};

const queryUserById = queryUser(QueryType.BY_ID);
const queryUserByEmail = queryUser(QueryType.BY_EMAIL);
const queryUserByPhoneNumber = queryUser(QueryType.BY_PHONE_NUMBER);

type EmailOrPhoneNumber = {
  email?: string;
  phonenumber?: string;
};

const queryUserOnly = async (param: EmailOrPhoneNumber) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: param.email }, { phonenumber: param.phonenumber }],
    },
  });
  return user;
};

enum MFAType {
  GOOGLE_AUTHENTICATOR,
  SMS_AUTHENTICATION,
}

type UserWithRole = {
  username?: string;
  password: string;
  email?: string;
  phonenumber?: string;
  is_mfa_enabled?: boolean;
  mfa_type?: MFAType;
  google_authenticator_secret?: string;
  role_id: number;
};

const createUserWithRole = async (param: UserWithRole) => {
  const { username, password, email, phonenumber, role_id } = param;
  const user = await prisma.user.create({
    data: {
      username: username || "user ichigo",
      password: await bcrypt.hash(password, 10),
      email,
      phonenumber,
      User_Roles: {
        create: {
          role_id,
        },
      },
    },
  });
  return user;
};

export {
  queryUserById,
  queryUserByEmail,
  queryUserByPhoneNumber,
  queryUserOnly,
  createUserWithRole,
};
