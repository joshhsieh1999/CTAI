import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { hasVersionAccess } from "@/app/lib/validation/version";
import fs from 'fs';
import { getServerSession } from "next-auth";
import path from "path";
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import z from "zod";

const imagesSchema = z.object({
    images: z.array(z.object({
        name: z.string(),
        gtBbox: z.object({
            labelName: z.string().nullable(),
            bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),    // x1, y1, x2, y2
        }), // blue
        pdBbox: z.object({
            labelName: z.string().nullable(),
            bbox: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]).nullable(),    // x1, y1, x2, y2, confidence
        }), // dark orange
    }))
});

function drawBoxAndLabel(
        ctx: CanvasRenderingContext2D, 
        bbox: [number, number, number, number], 
        label: string, color: string, 
        confidence: number | null, 
        existingLabels: Array<{ x: number, y: number, width: number, height: number }>
    ) {
    const [x1, y1, x2, y2] = bbox;
    const width = x2 - x1;
    const height = y2 - y1;
    const fontSize = 20;
    const textContent = confidence ? `${label} (${confidence.toFixed(2)})` : `${label}`;
    const textWidth = ctx.measureText(textContent).width + 10;
    const textHeight = fontSize + 10;
    ctx.font = `bold ${fontSize}px Arial`;

    // draw bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.strokeRect(x1, y1, width, height);

    let textX = x1 + 5;
    let textY = y1 - 5;

    // check if the label overlaps with existing labels
    for (const label of existingLabels) {
        const labelRight = label.x + label.width;
        const labelBottom = label.y - label.height;
        const textRight = textX + textWidth;
        const textBottom = textY - textHeight;

        if (textX < labelRight && textRight > label.x && textY > labelBottom && textBottom < label.y) {
            // if the label overlaps, move the text to the bottom of the bounding box
            textY = label.y + height + textHeight + 5;
            if (textY > ctx.canvas.height) {
                // if the label goes out of the canvas, move the text to the top of the bounding box
                textY = y1 - 2*textHeight - 5;
            }
        }
    }

    // check if the label goes out of the canvas
    // horizontal
    if (textX < 0) {    // left
        textX = 5;
    }
    if (textX + textWidth > ctx.canvas.width) { // right
        textX = ctx.canvas.width - textWidth - 5;
    }
    // vertical 
    if (textY - textHeight < 0) {   // top
        textY = y1 + height + textHeight + 5;
    }
    if (textY > ctx.canvas.height) {    // bottom
        textY = ctx.canvas.height - height - 5;
    }

    // draw half-transparent background for the text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(textX, textY - textHeight, textWidth, textHeight);

    // draw text
    ctx.fillStyle = color;
    ctx.fillText(textContent, textX + 5, textY - 5);

    existingLabels.push({ x: textX, y: textY, width: textWidth, height: textHeight });
}

/**
 * Handles the POST request for retrieving and processing images.
 * For each image, it draws the ground truth and predicted bounding boxes and labels.
 * The images are then converted to base64 format and returned in the response.
 * @param req - The request object.
 * @param params - The parameters object containing the versionId.
 * @returns A response object with the selected images.
 */
export async function POST(req: Request, { params }: { params: { versionId: number } }) {
    try {
        const { versionId } = params;
        const session = await getServerSession(authOptions)!;
        if (!session) {
            return new Response("Unauthorized", { status: 403 })
        }
        const { user } = session;

        if (!(await hasVersionAccess(versionId, user))) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
        }

        // parse Body
        const json = await req.json();
        const postBody = imagesSchema.parse(json);

        // query projectId from db
        const projectId = await prisma.version.findUnique({
            where: {
                id: Number(versionId),
            },
            select: {
                projectId: true,
            }
        })
        .then((version: any) => {
            return version!.projectId;
        });

        const directoryPath = path.resolve(process.cwd() + `/train_process/project-${projectId}/version-${versionId}/dataset/images`);
        console.log(directoryPath);
        const files = fs.readdirSync(directoryPath);

        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

        if (imageFiles.length === 0) {
            return new Response('No images found in the directory.', { status: 404 })
        }

        let selectedImages = [];
        for (const image of postBody.images ?? []) {
            const imagePath = path.join(directoryPath, image.name);
            try {
                const img = await loadImage(imagePath);
                const canvas = createCanvas(img.width, img.height);
                const ctx = canvas.getContext('2d');

                ctx.drawImage(img, 0, 0);

                const existingLabels: { x: number, y: number, width: number, height: number }[] = [];

                if (image.gtBbox.labelName && image.gtBbox.bbox) {
                    drawBoxAndLabel(ctx, image.gtBbox.bbox, image.gtBbox.labelName, 'blue', null, existingLabels);
                }

                if (image.pdBbox.labelName && image.pdBbox.bbox) {
                    const [x1, y1, x2, y2, confidence] = image.pdBbox.bbox;
                    drawBoxAndLabel(ctx, [x1, y1, x2, y2], image.pdBbox.labelName, 'darkorange', confidence, existingLabels);
                }

                const buffer = canvas.toBuffer('image/png');

                const base64Image = buffer.toString('base64');
                selectedImages.push({
                    name: image.name,
                    content: `data:image/png;base64,${base64Image}`
                });

            } catch (error) {
                console.error(`Error processing image ${image.name}:`, error);
            }
        }

        return new Response(JSON.stringify({
            images: selectedImages
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error(error)
        return new Response(null, { status: 500 })
    }
}
