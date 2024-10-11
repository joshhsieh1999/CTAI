import { authOptions } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { hasVersionAccess } from "@/app/lib/validation/version"
import { getServerSession } from "next-auth/next"
import z from "zod"

export interface IVersionDetail {
  status: string;
}

/**
 * Handles the GET request for retrieving version details.
 * 
 * @param req - The request object.
 * @param params - The parameters object containing the versionId.
 * @returns A response object with the version detail or an error response.
 */
export async function GET(req: Request, { params }: { params: { versionId: number } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new Response("Unauthorized", { status: 403 })
    }
    const { user } = session
    const { versionId } = params;

    if (!(await hasVersionAccess(versionId, user))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
    }

    const versionDetail = await prisma.version.findUnique({
      where: {
        id: Number(versionId),
      },
    });

    return new Response(JSON.stringify(versionDetail))
  } catch (error) {
    console.error(error)
    return new Response(null, { status: 500 })
  }
}

const versionPatchSchema = z.object({
  sessionId: z.optional(z.number()),
  datasetId: z.optional(z.number()),
  status: z.optional(z.string()),
})

// TODO: Restore authentication, currently disabled for docker call API
/**
 * Handles the PATCH request for a specific version to update its details.
 * @param req - The request object.
 * @param params - The parameters object containing the versionId.
 * @returns A response object.
 */
export async function PATCH(req: Request, { params }: { params: { versionId: number } }) {
  try {
    const { versionId }: { versionId: number } = params;
    // const session = await getServerSession(authOptions)!;
    // if (!session) {
    //   return new Response("Unauthorized", { status: 403 })
    // }
    // const { user } = session;

    if (!versionId) {
      return new Response(JSON.stringify({ error: 'versionId is required' }), { status: 422 })
    }

    // const projectId = await prisma.version.findFirst({
    //   where: {
    //     id: Number(versionId),
    //   },
    //   select: {
    //     projectId: true,
    //   },
    // }).then((res: any) => res!.projectId);

    // if (!(await hasProjectAccess(projectId, user))) {
    //   return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
    // }

    const json = await req.json()
    const body = versionPatchSchema.parse(json)

    const versions = await prisma.version.update({
      where: {
        id: Number(versionId),
      },
      data: {
        ...body,
      },
    })

    return new Response(JSON.stringify(versions))
  } catch (error) {
    console.error(error)
    return new Response(null, { status: 500 })
  }
}
