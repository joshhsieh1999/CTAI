import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getProjectIds } from "@/app/lib/validation/user";
import fs from 'fs';
import { getServerSession } from "next-auth/next";
import path from 'path';

/**
 * Retrieves all versions of projects that have model files of a specific format.
 * @param req - The request object.
 * @returns A response object containing the versions of projects with model files.
 */
export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const modelFormat : '.tf' | '.pt' | '.tflite' = searchParams.get("model-format") as '.tf' | '.pt' | '.tflite'
    if (!modelFormat) {
      return new Response(JSON.stringify({ message: 'Model type not found' }), { status: 404 });
    }
    // get all versions of the projects, and return as `projectName-version-1`, `projectName-version-2`, etc.

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
    }).then((projects) => {
      return projects.map((project) => {
        return project.versions.map((version) => {
          return {
            name: `${project.name}-version-${version.versionNum}`,
            projectId: project.id,
            versionId: version.id,
          }
        })
      }).flat()
    }).then((versions) => {
      // check all versions that have model files in results
      versions = versions.filter((version) => {
        const modelsDirPath = path.join(process.cwd(), 'train_process', `project-${version.projectId}`, `version-${version.versionId}`, 'results', 'exp', 'weights');
        if (!fs.existsSync(modelsDirPath)) {
          return false
        }
        const files = fs.readdirSync(modelsDirPath);
        const extensions = files.map(file => path.extname(file));
        const modelType = extensions.filter(extension => [`${modelFormat}`].includes(extension));
        // return true
        return modelType.length > 0
      })

      return versions
    })

    return new Response(JSON.stringify(projectsAllVersions))
  } catch (error) {
    console.error(error)
    return new Response(null, { status: 500 })
  }
}
