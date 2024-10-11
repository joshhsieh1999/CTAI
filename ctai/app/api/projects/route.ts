import { authOptions } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { randomString } from "@/app/lib/utils"
import { getProjectIds } from "@/app/lib/validation/user"
import { getServerSession } from "next-auth/next"
import { env } from "process"
import * as z from "zod"

const projectCreateSchema = z.object({
  name: z.string(),
  taskType: z.string(),
})

/**
 * Retrieves all projects associated with the authenticated user.
 * 
 * @returns A JSON response containing the projects.
 *          If the user is not authenticated, returns a "Unauthorized" response with status 403.
 *          If an error occurs, returns a response with status 500.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new Response("Unauthorized", { status: 403 })
    }

    const { user } = session

    // find all projects created by user or project that userid is recored in (projectMembers) table
    const projectIds = await getProjectIds(user.id)
    const projects = await prisma.project.findMany({
      where: {
        id: { in: projectIds },
      },
    })

    return new Response(JSON.stringify(projects))
  } catch (error) {
    return new Response(null, { status: 500 })
  }
}

/**
 * Handles the POST request for creating a project.
 * @param req - The request object.
 * @returns A response object containing the created project details.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new Response("Unauthorized", { status: 403 })
    }
    const { user } = session
    const json = await req.json()
    const body = projectCreateSchema.parse(json)

    const projectNameDuplicate = await prisma.project.findFirst({
      where: {
        creatorId: user.id,
        name: body.name,
      },
    })

    if (projectNameDuplicate) {
      return new Response(JSON.stringify({ error: "Project name already exists" }), { status: 422 })
    }

    const CVATOrganizationData = await createCVATOrganization(body, user.CVATAuthToken)
    const project = await prisma.project.create({
      data: {
        name: body.name,
        creatorId: user.id,
        organizationId: user.organizationId,
        taskType: body.taskType,
        CVATOrganizationId: CVATOrganizationData.id,
        CVATOrganizationSlug: CVATOrganizationData.slug,
      },
      select: {
        id: true,
        CVATOrganizationId: true,
        CVATOrganizationSlug: true,
      },
    })
    if (!project) {
      return new Response(JSON.stringify({ error: "Project creation failed" }), { status: 422 })
    }

    // create first version when creating project
    const version = await fetch(`${env.NEXTAUTH_URL}/api/projects/${project.id}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('cookie') || '',
      },
      body: JSON.stringify({}),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error('Project version creation failed', { cause: `${response.statusText}: ${await response.text()}` });
      }
      else {
        return await response.json()
      }
    });

    const ret = {
      id: project.id,
      versionId: version.id,
      CVATOrganizationId: project.CVATOrganizationId,
      CVATOrganizationSlug: project.CVATOrganizationSlug
    }

    return new Response(JSON.stringify(ret))
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    else if (error instanceof Error && error.message == 'CVAT failed') {
      return new Response(JSON.stringify({ error: error.cause }), { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}

async function createCVATOrganization(data: z.infer<typeof projectCreateSchema>, CVATHeaderKey: string) {
  const CVATdata = {
    slug: randomString(16),
    name: data.name,
  }

  // Default options are marked with *
  const CVATOrganizationData = await fetch(`${env.CVAT_URL}/api/organizations`!, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${CVATHeaderKey}`
    },
    credentials: 'include', // include, *same-origin, omit
    body: JSON.stringify(CVATdata) // body data type must match "Content-Type" header
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error('CVAT failed', { cause: `${response.statusText}: ${await response.text()}` });
    }
    return await response.json()
  });

  return CVATOrganizationData
}