import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth/next";

export interface IModelInfo {
  modelName: string;
  // modelType: string;
  framework: string;
  epochs: number;
  batchSize: number;
  learningRate: number;
}

/**
 * Retrieves model information for a specific version.
 * @param req - The request object.
 * @param params - The parameters object containing the versionId.
 * @returns A Response object with the model information or an error message.
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

    const { modelId, modelParams } = await prisma.version.findUnique({
      where: {
        id: Number(versionId),
      },
      select: {
        training: {
          select: {
            modelId: true,
            modelParams: true,
          },
        },
      },
    }).then((res) => { return { modelId: res!.training!.modelId, modelParams: res!.training!.modelParams } });

    const model = await prisma.model.findUnique({
      where: {
        id: modelId,
      },
    });

    const modelParamsObj = JSON.parse(modelParams as string);
    const retModelInfo = { ...modelParamsObj, ...model };

    return new Response(JSON.stringify(retModelInfo), { status: 200 });
  }
  catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
}