import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import fs from 'fs';
import { getServerSession } from "next-auth/next";
import path from 'path';

/**
 * Retrieves a model file based on the specified versionId and model format.
 * 
 * @param req - The request object.
 * @param params - The parameters object containing the versionId.
 * @returns A response object with the model file as an attachment.
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

    const { searchParams } = new URL(req.url);
    const modelFormat = searchParams.get("model-format")

    if (!modelFormat) {
      return new Response(JSON.stringify({ message: 'Model type not found' }), { status: 404 });
    }

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

    const modelsDirPath = path.join(process.cwd(), 'train_process', `project-${projectId}`, `version-${versionId}`, 'results', 'exp', 'weights');
    const modelNames = fs.readdirSync(modelsDirPath);
    // yolov5 model files are named best.pt and last.pt, we only need 'last.pt'
    // for other format exported by yolo, we only have one file
    const modelFile = modelNames.filter((fileName) => path.extname(fileName) === `${modelFormat}`)
      .find((fileName) => path.basename(fileName, path.extname(fileName)) !== 'best');

    if (!modelFile) {
      return new Response(JSON.stringify({ message: 'Model file not found' }), { status: 404 });
    }

    // Read the file as a stream
    const fileStream = fs.createReadStream(path.join(modelsDirPath, modelFile));

    // Prepare the response headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="model${modelFormat}"`);

    // Create a new response and attach the file stream
    return new Response(fileStream as any, {
      headers,
    });
  }
  catch (error) {
    console.error('Error fetching the file:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
}