import { authOptions } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { hasProjectAccess } from "@/app/lib/validation/project"
import { getServerSession } from "next-auth/next"
import z from "zod"

const versionPostSchema = z.object({
  sessionId: z.optional(z.number()),
  datasetId: z.optional(z.number()),
})

/**
 * Retrieves the versions of a project based on the provided projectId.
 * @param req - The request object.
 * @param params - The parameters object containing the projectId.
 * @returns A response object containing the versions of the project.
 */
export async function GET(req: Request, { params }: { params: { projectId: number } }) {
  try {
    const { projectId }: { projectId: number } = params;
    const session = await getServerSession(authOptions)!;
    if (!session) {
      return new Response("Unauthorized", { status: 403 })
    }
    const { user } = session;

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), { status: 422 })
    }

    if (!(await hasProjectAccess(projectId, user))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
    }

    const versions = await prisma.version.findMany({
      where: {
        projectId: Number(projectId),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      }
    })

    return new Response(JSON.stringify(versions))
  } catch (error) {
    console.error(error)
    return new Response(null, { status: 500 })
  }
}

/**
 * Handles the POST request for creating a new version of a project.
 * @param req - The request object.
 * @param params - The parameters object containing the projectId.
 * @returns A response object containing the newly created version.
 */
export async function POST(req: Request, { params }: { params: { projectId: number } }) {
  try {
    const { projectId } = params;
    const session = await getServerSession(authOptions)!;
    if (!session) {
      return new Response("Unauthorized", { status: 403 })
    }
    const { user } = session;

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), { status: 422 })
    }

    if (!(await hasProjectAccess(projectId, user))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
    }

    const json = await req.json()
    const postBody = versionPostSchema.parse(json);
    const latestVersion = await prisma.version.findFirst({
      where: {
        projectId: Number(params.projectId), // Filter by projectId
      },
      orderBy: {
        versionNum: 'desc', // Order by version number in descending order
      },
      select: {
        versionNum: true, // Select only the verNum field
      },
    });

    const version = await prisma.version.create({
      data: {
        projectId: Number(params.projectId),
        creatorId: Number(user.id),
        versionNum: latestVersion ? latestVersion.versionNum + 1 : 1,
        sessionId: Number(postBody.sessionId),
        datasetId: Number(postBody.datasetId),
      },
    })

    return new Response(JSON.stringify(version))
  } catch (error) {
    console.error(error)
    return new Response(null, { status: 500 })
  }
}