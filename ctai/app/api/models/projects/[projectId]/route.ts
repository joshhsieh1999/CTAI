import { prisma } from "@/app/lib/prisma";

/**
 * Retrieves models based on the specified project ID.
 * return all models that match project tasktype
 * tasktype and modelType are the same, "Object Detection" or "Classification"
 * @param req - The request object.
 * @param params - The parameters object containing the project ID.
 * @returns A response object containing the models as JSON.
 */
export async function GET(req: Request, { params }: { params: { projectId: number } }) {
    try {
        const tasktype = await prisma.project.findUnique({
            where: {
                id: Number(params.projectId)
            },
            select: {
                taskType: true
            }
        }).then((res) => res!.taskType);

        const models = await prisma.model.findMany(
            {
                where: {
                    modelType: {
                        equals: tasktype
                    },
                },
            }
        )

        return new Response(JSON.stringify(models))
    } catch (error) {
        return new Response(null, { status: 500 })
    }
}
