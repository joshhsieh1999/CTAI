import { authOptions } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { hasUserAccess } from "@/app/lib/validation/user"
import bcrypt from "bcryptjs"
import { getServerSession } from "next-auth/next"
import * as z from "zod"

const userPatchSchema = z.object({
    name: z.optional(z.string()),
    email: z.optional(z.string()),
    password: z.optional(z.string()),
    tel: z.optional(z.string()),
    organizationId: z.optional(z.number()),
    roleId: z.optional(z.number()),
    locale: z.optional(z.string()),
})

/**
 * Retrieves user data based on the provided userId.
 * 
 * @param req - The request object.
 * @param params - The parameters object containing the userId.
 * @returns A Response object containing the user data in JSON format.
 */
export async function GET(req: Request, { params }: { params: { userId: number } }) {
    try {
        const session = await getServerSession(authOptions)
        const userId = Number(params.userId)
        if (!session || !(await hasUserAccess(session.user, userId))) {
            return new Response("Unauthorized", { status: 403 })
        }

        const user = await prisma.user.findMany({
            where: {
                id: userId,
            },
        })

        return new Response(JSON.stringify(user))
    } catch (error) {
        return new Response(null, { status: 500 })
    }
}

/**
 * Updates a user's information based on the provided userId.
 * 
 * @param req - The request object.
 * @param params - The parameters object containing the user ID.
 * @returns A response object with the updated user information.
 */
export async function PATCH(req: Request, { params }: { params: { userId: number } }) {
    try {
        const session = await getServerSession(authOptions)
        const userId = Number(params.userId)

        if (!session || !(await hasUserAccess(session.user, userId))) {
            return new Response("Unauthorized", { status: 403 })
        }

        const json = await req.json()
        const body = userPatchSchema.parse(json)
        if (body.password) {
            body.password = bcrypt.hashSync(body.password, 10)
        }

        const user = await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                ...body,
            },
        })

        return new Response(JSON.stringify(user))
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.issues), { status: 422 })
        }

        return new Response(null, { status: 500 })
    }
}

/**
 * Deletes a user with the specified userId.
 * 
 * @param req - The request object.
 * @param params - The parameters object containing the userId.
 * @returns A Response object with the deleted user data or an error message.
 */
export async function DELETE(req: Request, { params }: { params: { userId: number } }) {
    try {
        const session = await getServerSession(authOptions)
        const userId = Number(params.userId)

        if (!session || !(await hasUserAccess(session.user, userId))) {
            return new Response("Unauthorized", { status: 403 })
        }

        await deleteCVATUser(session.user.CVATUserId, session.user.CVATAuthToken)

        const user = await prisma.user.delete({
            where: {
                id: userId,
            },
        })

        return new Response(JSON.stringify(user))
    } catch (error) {
        console.error(error)
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.issues), { status: 422 })
        }

        return new Response(null, { status: 500 })
    }
}

async function deleteCVATUser(CVATUserId: number, CVATAuthToken: string) {
    const response = await fetch(`${process.env.CVAT_URL}/api/users/${CVATUserId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Token ${CVATAuthToken}`,
        },
    }).then(async (response) => {
        if (!response.ok) {
            throw new Error('CVAT failed', { cause: `${response.statusText}: ${await response.text()}` });
        }
    })
}