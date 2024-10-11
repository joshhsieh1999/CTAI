import { authOptions } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { getServerSession } from "next-auth/next"

/**
 * Handles the GET request for retrieving users of a specific organization.
 * 
 * @param req - The request object.
 * @param params - The parameters object containing the organizationId.
 * @returns A Response object with the list of users in the organization or an error response.
 */
export async function GET(req: Request, { params }: { params: { organizationId: number } }) {
    try {
        const session = await getServerSession(authOptions)
        const organizationId = Number(params.organizationId)
        if (!session || session.user.organizationId !== organizationId) {
            return new Response("Unauthorized", { status: 403 })
        }

        const users = await prisma.user.findMany({
            where: {
                organizationId: organizationId,
            },
        })

        return new Response(JSON.stringify(users))
    } catch (error) {
        return new Response(null, { status: 500 })
    }
}
