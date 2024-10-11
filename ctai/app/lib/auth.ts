import { prisma } from "@/app/lib/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { env } from "process";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any, req: any) {
        if (!credentials || !credentials.email || !credentials.password) {
          return null;
        }

        const { email, password } = credentials;

        // Use Prisma to find the user by their email
        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (user && bcrypt.compareSync(password, user.password)) {
          // TODO: CVAT Auth
          const key = await CVATLogin(email, password);
          await prisma.user.update({
            where: { id: user.id },
            data: { CVATAuthToken: key },
          });
          console.log("Login ok! CVAT Auth Token updated: ", key);
          return user;
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (user) {
        const {
          id,
          name,
          email,
          tel,
          organizationId,
          roleId,
          CVATAuthToken,
          CVATUserId,
          locale,
          ...rest
        } = user;
        token = {
          ...token,
          id,
          name,
          email,
          tel,
          organizationId,
          roleId,
          CVATAuthToken,
          CVATUserId,
          locale,
        };
      }
      // Update the token right before it is returned
      if (trigger === "update" && session) {
        token = { ...token, ...session.user };
        return token;
      };
      // console.log("jwt callback", token, user);
      return token;
    },
    session: async ({ session, token }) => {
      // session callback is called whenever a session for that particular user is checked
      //  console.log('session callback', session, token);
      // you might return this in new version

      if (session) {
        session.user = token;
      }
      // console.log("session callback", session, token);
      return Promise.resolve(session);
    },
  },
  session: {
    strategy: "jwt" as const,
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  debug: process.env.NODE_ENV === "development",
};

async function CVATLogin(email: string, password: string) {
  const loginData = {
    username: email,
    email: email,
    password: password,
  };

  // Default options are marked with *
  const response = await fetch(`${env.CVAT_URL}/api/auth/login`, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(loginData), // body data type must match "Content-Type" header
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error("CVAT failed", {
        cause: `${response.statusText}: ${await response.text()}`,
      });
    } else {
      return await response.json();
    }
  });

  const { key } = response;
  return key;
}
