import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import fs from 'fs';
import { getServerSession } from "next-auth/next";
import path from 'path';

/**
 * Retrieves the available model types for a specific version.
 * @param req - The request object.
 * @param params - The parameters object containing the version.
 * @returns A Response object with the model types in the body.
 */
export async function GET(req: Request, { params }: { params: { versionId: number } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new Response("Unauthorized", { status: 403 })
    }

    const { user } = session

    // Assuming versionId is passed as a parameter to the route
    const { versionId } = params;

    const projectId = await prisma.version.findUnique({
      where: {
        id: Number(versionId),
      },
      select: {
        projectId: true,
      },
    }).then((version: any) => {
      return version!.projectId;
    })

    // Construct the file path
    // TODO: write script to move models.json to the general result folder to support cross-framework model types
    const dirPath = path.join(process.cwd(), 'train_process', `project-${projectId}`, `version-${versionId}`, 'results', 'exp', 'weights');
    const files = fs.readdirSync(dirPath);
    const extensions = files.map(file => path.extname(file));
    const support_extensions = ['.tflite', '.pt', '.tf'];
    const modelType = extensions.filter(extension => support_extensions.includes(extension));
    return new Response(JSON.stringify(modelType), { status: 200 });

  }
  catch (error) {
    console.error('Error fetching the file:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
}