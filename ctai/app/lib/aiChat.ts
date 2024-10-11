import { IAllClassAP } from "../api/versions/[versionId]/reports/all-class-AP/route";
import { IDataHealth } from "../api/versions/[versionId]/reports/data-health-check/route";
import { IEvalDetail } from "../api/versions/[versionId]/reports/eval-detail/route";
import { ITrainingStatus } from "../api/versions/[versionId]/reports/training-status/route";
import { encodingForModel } from "js-tiktoken";

interface indicatorProps {
    mAP: number;
    Recall: number;
    Precision: number;
    F1: number;
}

const encoding = encodingForModel("gpt-4o");

function calculateQueryToken(prompt: string) {
    const calculateQueryToken = encoding.encode(prompt).length;
    return calculateQueryToken;
}

export function getIndicatorPrompt(indicator: indicatorProps) {
    const prompt = `Please provide a short, easy to understand summary and evaluation of the object detection model training results based on the following metrics:
    Mean Average Precision (mAP), Recall, Precision, and F1-Score. Include the following details in your response:
    - An overview of the model's overall performance.
    - A comparison of the mAP, Recall, Precision, and F1-Score values.
    - Insights into the strengths and weaknesses of the model.
    **Do not include any markdown or code blocks.**
    **Do not repeat the information provided in the prompt.**
    Below are the metrics:
    Mean Average Precision (mAP): ${indicator.mAP}
    Recall: ${indicator.Recall} 
    Precision: ${indicator.Precision}
    F1-Score: ${indicator.F1}
    `
    const embedQueryTokens = calculateQueryToken(prompt);
    console.log('embedQueryTokens in Indicator', embedQueryTokens);
    return prompt;
}

export function getAllClassAPPrompt(allClassAP: IAllClassAP) {
    const prompt = `Based on the following class-wise Average Precision (AP) values, please provide a short, easy to understand summary and analyze the distribution of AP values. 
    **Do not include any markdown or code blocks.**
    **Do not repeat the information provided in the prompt.**
    Below are the class-wise AP values:
    ${Object.keys(allClassAP).filter((item) => item !== "all").map((key) => `${key}: ${allClassAP[key].mAP}`).join('\n')}`
    const embedQueryTokens = calculateQueryToken(prompt);
    console.log('embedQueryTokens in AllClassAP', embedQueryTokens);
    return prompt;
}

export function getModelInfoPrompt(modelName: string) {
    const prompt = `Please provide a short description of the given object detection model used for training. 
    Describe the key features and strengths of the model.
    **Do not include any markdown or code blocks.**
    **Do not repeat the information provided in the prompt.**
    Below is the model name: ${modelName}`
    const embedQueryTokens = calculateQueryToken(prompt);
    console.log('embedQueryTokens in ModelInfo', embedQueryTokens);
    return prompt;
}

export function getDataHealthCheckPrompt(dataHealth: IDataHealth) {
    const data = `
    Below are Object detction model dataset infomations:
    Total number of images: ${dataHealth.imagesCount}
    Total number of annotations: ${dataHealth.annotationsCount}
    Image size ratios (in pixels):
    Median: width = ${dataHealth.ratio.image.median.w}, height = ${dataHealth.ratio.image.median.h}
    Largest: width = ${dataHealth.ratio.image.largest.w}, height = ${dataHealth.ratio.image.largest.h}
    Smallest: width = ${dataHealth.ratio.image.smallest.w}, height = ${dataHealth.ratio.image.smallest.h}
    Annotation size (in pixels):
    Median: width = ${dataHealth.ratio.annotation.median.w}, height = ${dataHealth.ratio.annotation.median.h}
    Largest: width = ${dataHealth.ratio.annotation.largest.w}, height = ${dataHealth.ratio.annotation.largest.h}
    Smallest: width = ${dataHealth.ratio.annotation.smallest.w}, height = ${dataHealth.ratio.annotation.smallest.h}
    background images (images without annotations): ${dataHealth.nullExamples.length}
    Train/Val/Test split: ${dataHealth.trainSplit.train} / ${dataHealth.trainSplit.validation} / ${dataHealth.trainSplit.test}
    Class distribution: ${JSON.stringify(dataHealth.classDistribution)}
    `

    const post_prompt = `Let's think about it step by step, firstly,
    get the short summary of the above object detection model dataset information,
    then based on the short summary, put forward the potential issues you observe,
    and finally, based on the potential issues, put forward the corresponding solutions.

    Let's take an example:
    
    example dataset information(input) is below:
    ----------------------
    Total number of images: 3537
    Total number of annotations: 87661
    Image size ratios (in pixels):
    Median: width = 640, height = 480
    Largest: width = 640, height = 480
    Smallest: width = 640, height = 480
    Annotation size (in pixels):
    Median: width = 38, height = 42
    Largest: width = 56, height = 66
    Smallest: width = 27, height = 7
    background images (images without annotations): 13
    Train/Val/Test split: 2475 / 708 / 354
    Class distribution: {"Good":56558,"Bad":31103}
    ----------------------
    
    you need to output in following format:
    
    Short summary (with potential issues):
    // short, clear summary
    
    // A blank line
    Suggestion (solutions for corresponding issues):
    - ...
    - ...
    
    **Do not include any markdown or code blocks.**
    **Do not repeat the information provided in the prompt.**
    `
    const prompt = data + post_prompt;
    const embedQueryTokens = calculateQueryToken(prompt);
    console.log('embedQueryTokens in DataHealthCheck', embedQueryTokens);
    console.log('prompt in DataHealthCheck', prompt);
    return prompt;
}

export function getTrainStatusPrompt(training_status: ITrainingStatus["train_metrics"]) {
    const pre_prompt = `Let's think about it step by step, firstly, get the short summary of the given object detection model training status, then, based on the short summary, put forward the potential issues you observe(including but not limited to overfitting, underfitting, ignore if not obvious), and finally, based on the potential issues, put forward the corresponding solutions.

    Let's take an example:
    
    example training status(input in Json format) is below:
    ----------------------
    {"obj_loss":{"train":[0.15109,0.1553,0.15296,0.15156,0.14704],"val":[0.14319,0.13386,0.12984,0.12614,0.12213]},"cls_loss":{"train":[0.026396,0.016085,0.0074305,0.0044216,0.0034648],"val":[0.02122,0.0081231,0.0038883,0.0026973,0.0023789]},"box_loss":{"train":[0.093234,0.062143,0.058791,0.048407,0.044786],"val":[0.056986,0.064484,0.047099,0.046927,0.036266]},"precision":[0.51651,0.37494,0.7242,0.61228,0.99195],"recall":[0.74855,0.77056,0.88444,0.9101,0.96493],"mAP":[0.66813,0.46359,0.85709,0.78994,0.98694]}
    ----------------------
    
    you need to output in following format:
    
    Short summary (with potential issues):
    // short, clear summary
    
    // A blank line
    Suggestion (solutions for corresponding issues):
    - ...
    - ...
    
    **Do not include any markdown or code blocks.**
    **Do not repeat the information provided in the prompt.**
    **If train/val cls_loss always 0, it must cause by single class dataset, you can ignore it.** 
    
    the training status(input) is below:
    `
    // if training_status is too long, we need to interval sampling to reduce the length, here we interval sampling to let the length of each array i, if the length of the array is less tha, we keep it.
    const DOWN_SAMPLE_LENGTH = 50;
    const downsampleArray = (arr: number[]) => {
        if (arr.length <= DOWN_SAMPLE_LENGTH) {
            return arr;
        }
        const step = arr.length / DOWN_SAMPLE_LENGTH;
        const result = [];
        for (let i = 0; i < DOWN_SAMPLE_LENGTH; i++) {
            result.push(arr[Math.floor(i * step)]);
        }
        return result;
    };

    const data = `
    mAP: ${downsampleArray(training_status.mAP).join(",")}, ${downsampleArray(training_status.mAP).join(",")}
    obj_loss: ${downsampleArray(training_status.obj_loss.train).join(",")}, ${downsampleArray(training_status.obj_loss.val).join(",")}
    cls_loss: ${downsampleArray(training_status.cls_loss.train).join(",")}, ${downsampleArray(training_status.cls_loss.val).join(",")}
    box_loss: ${downsampleArray(training_status.box_loss.train).join(",")}, ${downsampleArray(training_status.box_loss.val).join(",")}
    `

    const prompt = pre_prompt + data;
    const embedQueryTokens = calculateQueryToken(prompt);
    console.log('embedQueryTokens in TrainStatus', embedQueryTokens);
    console.log('prompt in TrainStatus', prompt);
    return prompt;
}

export function getEvalDetailPrompt(evalDetail: IEvalDetail) {
    let labelArray = Object.keys(evalDetail.class_mapping).map(key => evalDetail.class_mapping[key]);
    labelArray.push("background");
    // format text table for confusion matrix
    let matrixText = "Confusion Matrix:\n";
    matrixText += "Predicted\\Actual | ";
    matrixText += labelArray.map(label => label.padEnd(15)).join(" | ");
    matrixText += "\n";
    matrixText += "-".repeat((labelArray.length + 1) * 15) + "\n";
    for (let i = 0; i < labelArray.length; i++) {
        matrixText += labelArray[i].padEnd(15) + " | ";
        for (let j = 0; j < labelArray.length; j++) {
            // if i and j are both equal to the length of the labelArray -1 , it means it is the background/background, so we need to skip it.
            if (i === labelArray.length - 1 && j === labelArray.length - 1) {
                matrixText += "X".padEnd(15) + " | ";
                continue;
            }
            matrixText += evalDetail.confusion_matrix[i][j].length.toString().padEnd(15) + " | ";
        }
        matrixText += "\n";
    }
    const prompt = `Please provide a summary based on the given object detection model confusion matrix.
    Don't interpret the data in all the cells, just select the ones with important information.
    **Note: The "background" label isn't a class, but rather the absence of any class, so background/background (denote as X) is meaningless.
    Thus, if a class is predicted to be background, it should be considered a false negative; if a background is predicted to be a class, it should be considered a false positive.**
    **Do not include any markdown or code blocks.**
    **Do not repeat the information provided in the prompt.**
    Below is the confusion matrix:
    ${matrixText}
    `
    const embedQueryTokens = calculateQueryToken(prompt);
    console.log('embedQueryTokens in EvalDetail', embedQueryTokens);
    return prompt;
}