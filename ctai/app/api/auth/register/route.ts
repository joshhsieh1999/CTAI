import { prisma } from "@/app/lib/prisma"
import bcrypt from "bcryptjs"
import { env } from "process"
import * as z from "zod"

const userCreateSchema = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
  tel: z.optional(z.string()),
  organizationId: z.number(),
  roleId: z.number(),
})

export async function POST(req: Request, res: Response) {
  try {

    const json = await req.json()
    const body = userCreateSchema.parse(json)

    const userDuplicate = await prisma.user.findFirst({
      where: {
        email: body.email,
      }
    })

    if (userDuplicate) {
      return new Response(JSON.stringify({ error: "Email already exists" }), { status: 422 })
    }

    const { key, sessionCookies, CVATUserId } = await registerCVAT(body);
    // cookies().set('sessionid', sessionCookies);
    body.password = await bcrypt.hash(body.password, 10)
    const user = await prisma.user.create({
      data: {
        ...body,
        CVATAuthToken: key,
        CVATUserId: CVATUserId,
      },
    })

    console.log('set cookie', `${sessionCookies}`)

    return new Response(JSON.stringify(user), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${sessionCookies}`,
      },
    });

  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    else if (error instanceof Error && error.message == 'CVAT failed') {
      return new Response(JSON.stringify({ error: error.cause }), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}

async function registerCVAT(data: z.infer<typeof userCreateSchema>) {
  const registerData = {
    username: data.email,
    email: data.email,
    password1: data.password,
    password2: data.password,
    first_name: data.name,
    last_name: data.name,
  }

  console.log('registerData', JSON.stringify(registerData))

  // Default options are marked with *
  const response = await fetch(`${env.CVAT_URL}/api/auth/register`!, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: {
      'Content-Type': 'application/json'
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: JSON.stringify(registerData) // body data type must match "Content-Type" header
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error('CVAT failed', { cause: `${response.statusText}: ${await response.text()}` });
    }
    else {
      return response
    }
  });

  const sessionCookies = response.headers.get('set-cookie');
  const { key } = await response.json();

  const CVATUserId = await fetch(`${env.CVAT_URL}/api/users/self`!, {
    method: 'GET', // *GET, POST, PUT, DELETE, etc.
    headers: {
      'Authorization': `Token ${key}`
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error('CVAT failed', { cause: `${response.statusText}: ${await response.text()}` });
    }
    else {
      return response
    }
  }).then(async (response) => {
    return response.json()
  }).then((response: any) => {
    return response.id
  });

  return { key, sessionCookies, CVATUserId };
}
