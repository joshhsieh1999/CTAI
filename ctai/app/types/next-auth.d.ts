// types/next-auth.d.ts or simply next-auth.d.ts at the root of your src or project

import 'next-auth';

declare module 'next-auth' {
  // Extend the User model if you have added other properties
  interface User {
    id: number; // Assuming `id` is a number
    name : string;
    email : string;
    tel: string?;
    organizationId: number;
    roleId: number;
    CVATAuthToken: string;
    CVATUserId: int;
    locale: string;
  }

  // Extend the Session model to include the custom user type
  interface Session {
    user: {
        id: number;
        name : string;
        email : string;
        tel: string?;
        organizationId: number;
        roleId: number;
        CVATAuthToken: string;
        CVATUserId: int;
        locale: string;
    };
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extends the built-in JWT type from NextAuth.js
   * with additional properties.
   */
  interface JWT {
    id: number; // Example of adding a user ID property
    name : string;
    email : string;
    tel: string?;
    organizationId: number;
    roleId: number;
    CVATAuthToken: string;
    CVATUserId: int;
    locale: string;
  }
}