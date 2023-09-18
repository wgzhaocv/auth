import { MFAType, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

const selectUserObj = {
  User_Roles: {
    include: {
      role: {
        select: {
          role_id: true,
          role_name: true,
          Role_Permissions: {
            include: {
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
};

const queryUserById = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: {
      user_id: id,
    },
    include: selectUserObj,
  });
  return user;
};
const queryUserByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email_phonenumber: {
        email,
        phonenumber: "",
      },
    },
    include: selectUserObj,
  });
  return user;
};
const queryUserByPhoneNumber = async (phonenumber: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email_phonenumber: {
        email: "",
        phonenumber,
      },
    },
    include: selectUserObj,
  });
  return user;
};

type EmailOrPhoneNumber = {
  email?: string;
  phonenumber?: string;
};

const queryUserOnly = async (param: EmailOrPhoneNumber) => {
  const user = await prisma.user.findFirst({
    where: {
      email: param.email ?? "",
      phonenumber: param.phonenumber ?? "",
    },
  });
  return user;
};

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

const saveAuthCode = async (user_id: number, code: string) => {
  try {
    const authInfo = await prisma.verification.create({
      data: {
        user_id,
        code,
        expiresAt: new Date(Date.now() + 1000 * 60 * 5),
      },
    });

    return { success: true, authInfo };
  } catch (error) {
    console.error("Error saving auth code:", error);
    return { success: false, error };
  }
};

const verifyAuthCode = async (user_id: number, code: string) => {
  try {
    const authResult = await prisma.verification.findFirst({
      where: {
        user_id,
        code,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (authResult) {
      await prisma.verification.delete({
        where: {
          user_id,
        },
      });
      return { success: true, authResult };
    } else {
      return { success: false, message: "Invalid or expired code" };
    }
  } catch (error) {
    console.error("Error verifying auth code:", error);
    return { success: false, error };
  }
};

const updateUserMFA = async (user_id: number, secret: string) => {
  try {
    const user = await prisma.user.update({
      where: {
        user_id,
      },
      data: {
        is_mfa_enabled: true,
        google_authenticator_secret: secret,
        mfa_type: MFAType.GOOGLE_AUTHENTICATOR,
      },
    });
    return user;
  } catch (error) {
    console.log(error);
    throw new Error("Error updating user MFA");
  }
};

export {
  queryUserById,
  queryUserByEmail,
  queryUserByPhoneNumber,
  queryUserOnly,
  createUserWithRole,
  saveAuthCode,
  verifyAuthCode,
  updateUserMFA,
};
