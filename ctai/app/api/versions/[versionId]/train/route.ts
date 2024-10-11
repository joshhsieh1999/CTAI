import { authOptions } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { hasProjectAccess } from "@/app/lib/validation/project"
import { getServerSession } from "next-auth/next"
import z from "zod"

export interface ModelSettings {
    modelId: number;
    learningRate: number;
    epochs: number;
    batchSize: number;
}

export interface DatasetSettings {
    train: number;
    val: number;
    test: number;
}

export interface TrainingSettings {
    modelSettings: ModelSettings;
    datasetSettings: DatasetSettings;
}

const trainSettingsSchema: z.ZodType<TrainingSettings> = z.object({
    modelSettings: z.object({
        modelId: z.number(),
        learningRate: z.number(),
        epochs: z.number(),
        batchSize: z.number(),
    }),
    datasetSettings: z.object({
        train: z.number(),
        val: z.number(),
        test: z.number(),
    }),
});


// TODO: Restore authentication, currently disabled for docker call API
/**
 * Handles the POST request for training a model.
 * This function will create a new training row in the database and link it to the version.
 * It will also update the version status to pending and link it to the training.
 * It will update the dataset setting( currently only train, val, test split), and get the dataset path.
 * It will call the train API.
 * @param req - The request object.
 * @param params - The parameters object containing the versionId.
 * @returns A response indicating the success or failure of the training process.
 */
export async function POST(req: Request, { params }: { params: { versionId: number } }) {
    try {
        const { versionId }: { versionId: number } = params;
        const session = await getServerSession(authOptions)!;

        if (!session) {
            return new Response("Unauthorized", { status: 403 })
        }
        const { user } = session;

        if (!versionId) {
            return new Response(JSON.stringify({ error: 'versionId is required' }), { status: 422 })
        }

        const { projectId, datasetId } = await prisma.version.findUnique({
            where: {
                id: Number(versionId),
            },
            include: {
                dataset: true,
            },

        }).then((res) => { return { projectId: res!.projectId, datasetId: res!.dataset!.id } });

        if (!(await hasProjectAccess(projectId, user))) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
        }

        const json = await req.json()
        const { modelSettings, datasetSettings } = trainSettingsSchema.parse(json)
        const { modelId, ...modelParams } = modelSettings

        // create a new training row, and link it to the version
        const trainingId = await prisma.training.create({
            data: {
                modelId: modelId,
                modelParams: JSON.stringify(modelParams),
            },
        }).then((res) => res.id);

        // Update version status to pending and link it to the training
        await prisma.version.update({
            where: {
                id: Number(versionId),
            },
            data: {
                status: 'Pending',
                sessionId: trainingId,
            }
        })

        // update dataset setting( currently only train, val, test split), and get the dataset path
        const dataset = await prisma.dataset.update(
            {
                where: {
                    id: datasetId,
                },
                data: {
                    datasetSplit: JSON.stringify(datasetSettings),
                },
                select: {
                    filePath: true,
                }
            }
        )

        const modelName = await prisma.model.findUnique({
            where: {
                id: modelId,
            },
            select: {
                modelName: true,
            }
        }).then((res) => res!.modelName);

        // remove last slash if any and get the last part of the path
        const datasetPath = dataset!.filePath.replace(/\/$/, '').split('/').pop()

        // call the train API
        return fetch("http://192.168.2.94:8087/train?datasetPath=" + datasetPath + "&projectId=" + projectId + "&versionId=" + versionId + "&train=" + datasetSettings.train + "&val=" + datasetSettings.val + "&test=" + datasetSettings.test + "&epochs=" + modelSettings.epochs + "&batchSize=" + modelSettings.batchSize + "&learningRate=" + modelSettings.learningRate + "&modelName=" + modelName)
            .then((res) => {
                if (!res.ok) {
                    console.error(res.statusText)
                    return new Response(JSON.stringify({ error: 'Failed to train model' }), { status: 500 });
                }
                return new Response(JSON.stringify({ success: true }), { status: 200 })
            }).catch((error) => {
                return new Response(JSON.stringify({ error: 'Failed to train model' }), { status: 500 });
            });

    } catch (error) {
        console.error(error)
        return new Response(null, { status: 500 })
    }
}
