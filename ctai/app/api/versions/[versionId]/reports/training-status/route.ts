import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import fs from 'fs';
import { getServerSession } from "next-auth/next";
import path from 'path';


export interface ITrainingStatus {
  start_at: number;
  ETA: number;
  cur_epoch: number;
  total_epoch: number;
  completed_at: number;
  train_metrics:{
    obj_loss: {
      train: number[];
      val: number[];
    };
    cls_loss: {
      train: number[];
      val: number[];
    };
    box_loss: {
      train: number[];
      val: number[];
    };
    precision: number[];
    recall: number[];
    mAP: number[];
  };
  system_metrics: Array<object>;
}

/**
 * Retrieves the training status report for a specific version.
 * @param req - The request object.
 * @param params - The parameters object containing the versionId.
 * @returns A Response object with the training status report.
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

    const filePath = path.join(process.cwd(), `train_process`,  `project-${projectId}`, `version-${versionId}` , 'results',  'analysis_results', 'log.json');
    const resolvedPath = path.resolve(filePath);

    // Read the JSON file
    // Check if the file exists
    if (!fs.existsSync(resolvedPath)) {
      return new Response(JSON.stringify({ message: 'File not found' }), { status: 404 });
    }

    const data = fs.readFileSync(resolvedPath, 'utf8');
    const trainingStatus = JSON.parse(data);

    return new Response(JSON.stringify(trainingStatus), { status: 200 });

  }
  catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
}