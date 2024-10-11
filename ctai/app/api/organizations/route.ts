import { authOptions } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { getServerSession } from "next-auth/next"
import * as z from "zod"

const organizationCreateSchema = z.object({
  name: z.string(),
  uniformNumber: z.number(),
  description: z.optional(z.string()),
})

/**
 * Handles the GET request for organizations.
 * Retrieves a list of organizations from the database.
 * This is API is preserved for backward compatibility.
 * Currently, this API is not used in the application.
 * 
 * @returns {Promise<Response>} A Promise that resolves to a Response object containing the list of organizations in JSON format.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new Response("Unauthorized", { status: 403 })
    }

    const organizations = await prisma.organization.findMany()

    return new Response(JSON.stringify(organizations))
  } catch (error) {
    return new Response(null, { status: 500 })
  }
}

/**
 * Handles the POST request for creating a new organization.
 * @param req - The request object.
 * @returns A response object with the created organization data or an error message.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new Response("Unauthorized", { status: 403 })
    }
    const { user } = session
    const json = await req.json()
    const body = organizationCreateSchema.parse(json)

    const organizationDuplicate = await prisma.organization.findFirst({
      where: {
        uniformNumber: Number(body.uniformNumber),
      },
    })

    if (organizationDuplicate) {
      return new Response(JSON.stringify({ error: "Orgnization uniformNumber already exists" }), { status: 422 })
    }

    const post = await prisma.organization.create({
      data: {
          uniformNumber: Number(body.uniformNumber),
          name: body.name,
          description: body.description,
        },
      select: {
        id: true,
      },
    })

    return new Response(JSON.stringify(post))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
