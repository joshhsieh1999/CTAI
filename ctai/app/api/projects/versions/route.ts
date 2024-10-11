import { authOptions } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { getProjectIds } from "@/app/lib/validation/user"
import { getServerSession } from "next-auth/next"

/**
 * Retrieves all versions of projects for a user.
 * @returns {Promise<Response>} A Promise that resolves to a Response object containing the versions of projects.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new Response("Unauthorized", { status: 403 })
    }

    const { user } = session

    const projectIds = await getProjectIds(user.id)

    if (projectIds.length === 0) {
      return new Response(JSON.stringify([]))
    }

    const projectsAllVersions = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        taskType: true,
        versions: {
          select: {
            id: true,
            projectId: true,
            versionNum: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            creator: {
              select: {
                name: true,
              },
            }
          }
        }
      },
      where: {
        id: { in: projectIds }
      },
    });


    return new Response(JSON.stringify(projectsAllVersions))
  } catch (error) {
    console.error(error)
    return new Response(null, { status: 500 })
  }
}
