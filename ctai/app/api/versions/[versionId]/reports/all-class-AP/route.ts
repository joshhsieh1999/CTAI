import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import fs from 'fs';
import { getServerSession } from "next-auth/next";
import path from 'path';

export interface IAllClassAP {
  [key: string]: {
    precision: number;
    recall: number;
    f1: number;
    mAP: number;
  };
}

/**
 * Retrieves the indicators(mAP,Precision,Recall...) from a JSON file based on the provided versionId.
 * @param req - The request object.
 * @param params - The parameters object containing the versionId.
 * @returns A Response object with the indicators JSON or an error message.
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
    }).then((res) => res!.projectId);

    const filePath = path.join(process.cwd(), `train_process`,  `project-${projectId}`, `version-${versionId}` , 'results',  'test', 'results.json');
    const resolvedPath = path.resolve(filePath);

    // Read the JSON file
    // Check if the file exists
    if (!fs.existsSync(resolvedPath)) {
      return new Response(JSON.stringify({ message: 'File not found' }), { status: 404 });
    }

    const data = fs.readFileSync(resolvedPath, 'utf8');
    const training_status = JSON.parse(data);
    return new Response(JSON.stringify(training_status), { status: 200 });

  }
  catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
}