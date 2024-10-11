"use client";
import { IAllClassAP } from "@/app/api/versions/[versionId]/reports/all-class-AP/route";
import { IDataHealth } from "@/app/api/versions/[versionId]/reports/data-health-check/route";
import { IEvalDetail } from "@/app/api/versions/[versionId]/reports/eval-detail/route";
import { IModelInfo } from "@/app/api/versions/[versionId]/reports/model-info/route";
import { ITrainingStatus } from "@/app/api/versions/[versionId]/reports/training-status/route";
import { getAllClassAPPrompt, getDataHealthCheckPrompt, getEvalDetailPrompt, getIndicatorPrompt, getModelInfoPrompt, getTrainStatusPrompt } from "@/app/lib/aiChat";
import { Button } from "@/app/ui/button";
import { ExclamationCircleIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon, ViewfinderCircleIcon } from "@heroicons/react/24/outline";
import { Card, CardBody, CardHeader, Image, Progress, Spinner, Tooltip } from "@nextui-org/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { saveAs } from 'file-saver';
import { useParams } from "next/navigation";
import React, { useState } from "react";
import { toast } from "react-toastify";
import AIChat from "./AIChat/AIChat";
import CardDataSetStats from "./Card/CardDataSetStats";
import CardDataStats from "./Card/CardDataStats";
import ChartAllClassAPBar from "./Charts/chartAllClassAPBar";
import ChartConfusionMatrix from "./Charts/chartConfusionMatrix";
import ChartDataDistribution from "./Charts/chartDataDistribution";
import ChartPlotAccu from "./Charts/chartPlotAccu";
import ChartPlotLoss from "./Charts/chartPlotLoss";
import EmblaCarousel from "./embla-carousel/EmblaCarousel";

const ReportDashboard: React.FC = () => {

  // get ids from url and force convert string to number
  const { project_id: projectId, version_id: versionId } = Object.fromEntries(
    Object.entries(useParams<{ project_id: string; version_id: string }>()).map(([k, v]) => [k, +v]));


  const { data: allClassAPData, isLoading: allClassAPIsLoading } = useQuery<IAllClassAP>({
    queryKey: ['reports', 'allClassAP', versionId],
    queryFn: async () => {
      const response = await fetch(`/api/versions/${versionId}/reports/all-class-AP`);
      if (!response.ok) {
        throw new Error('Failed to fetch all-class-AP');
      }
      return response.json();
    }
  }
  );

  const { data: trainingStatusData, isLoading: trainingStatusIsLoading } = useQuery<ITrainingStatus>({
    queryKey: ['reports', 'trainingStatus', versionId, 'view'],
    queryFn: async () => {
      const response = await fetch(`/api/versions/${versionId}/reports/training-status`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      return response.json();
    },
    enabled: !!projectId && !!versionId,
  });

  return (
    <>
      {!(!!projectId && !!versionId) ?
        <div className='flex justify-center h-screen mt-10'>
          <Spinner aria-label="Loading..." />
        </div>
        :
        <>
          <h1 className="text-3xl font-black tracking-tight mb-8 sm:-ml-1 lg:-ml-2 lg:px-0">Report</h1>
          <div className="container mx-auto p-4">
            <BasicIndicatorCard data={allClassAPData} isLoading={allClassAPIsLoading} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-white shadow mb-4 shadow-lg md:mb-6">
                <div className="px-4 py-4 sm:px-6 flex gap-x-2">
                  <h1 className="text-2xl font-black mb-2">Classes Performance</h1>
                  {allClassAPIsLoading ? <Spinner aria-label="Loading..." /> : <AIChat userMessage={getAllClassAPPrompt(allClassAPData!)} />}
                </div>
                <hr className="border-t border-gray-200" />
                <div className="px-4 py-4 sm:px-6 flex flex-col min-h-96">
                  {/* TODO: Add the overall problem */}
                  {/* <div>
                    <OverallProblem />
                  <hr className="border-t border-gray-200 mt-4 mb-4" />
                  </div> */}
                  <AllClassAP data={allClassAPData} isLoading={allClassAPIsLoading} />
                </div>
              </div>

              <ModelInfo projectId={projectId} versionId={versionId} enableAIChat={true} />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Dataset Health Check */}
              <DataHealthCheck projectId={projectId} versionId={versionId} />

              {/* Training Status */}
              <TrainingStatus data={trainingStatusData?.train_metrics} isLoading={trainingStatusIsLoading} enableAIChat={true}/>


              {/* Evaluation Detail */}
              <EvaluationDetail projectId={projectId} versionId={versionId} />

              {/* Suggestion */}
              <div className="rounded-lg bg-white shadow mb-4 shadow-lg md:mb-6">
                {/* <div className="px-4 py-4 sm:px-6">
              <h1 className="text-xl font-black">Suggestion</h1>
            </div>
            <hr className="border-t border-gray-200" /> */}
                <div className="px-4 py-4 sm:px-6">
                  <h1 className="text-2xl font-black text-black dark:text-white mb-2">Do you want the model to perform <span className="text-[#2563EB]">better</span>?</h1>
                  <p className="text-xl font-medium text-gray-800 dark:text-white mb-8">You can do the following adjustments:</p>
                  <Suggestion projectId={projectId} versionId={versionId} />
                </div>
                <hr className="border-t border-gray-200" />
              </div>

              {/* Export Model */}
              <div className="rounded-lg bg-white shadow mb-4 shadow-lg md:mb-6">
                <div className="px-4 py-4 sm:px-6">
                  <h1 className="text-2xl font-black mb-2">Export Model</h1>
                  <h2 className="text-xl font-medium text-gray-800">Select the type you want to export</h2>
                </div>
                <hr className="border-t border-gray-200" />
                <div className="px-4 py-4 sm:px-6">
                  <ExportModel projectId={projectId} versionId={versionId} />
                </div>
                <hr className="border-t border-gray-200" />
              </div>

            </div>

          </div>
        </>
      }
    </>
  );
};

export default ReportDashboard;

function BasicIndicatorCard({ data, isLoading }: { data: IAllClassAP | undefined; isLoading: boolean }) {
  // calculate the average of all class AP

  return (
    <>
      <div className="rounded-lg bg-white shadow mb-4 shadow-lg md:mb-6">
        <div className="px-4 py-4 sm:px-6 flex gap-x-2">
          <h1 className="text-2xl font-black mb-2">Indicators</h1>
          {isLoading ? <Spinner aria-label="Loading..." /> : <AIChat userMessage={getIndicatorPrompt({ mAP: data!.all!.mAP, Recall: data!.all!.recall, Precision: data!.all!.precision, F1: data!.all!.f1 })} />}
        </div>
        <hr className="border-t border-gray-200" />
        <div className="px-4 py-4 sm:px-6">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5 mb-4">
            <CardDataStats title="Accuracy (mAP)" score={data?.all?.mAP} toolTipContent={
              <>
                <div className="px-1 py-2 max-w-md">
                  <div className="text-base font-bold">Accuracy of Detection</div>
                  <div className="text-md">Shows how well the model detects objects correctly, averaged across all types. Higher is better.</div>
                </div>
              </>
            } />

            <CardDataStats title="Recall" score={data?.all.recall} toolTipContent={
              <>
                <div className="px-1 py-2 max-w-md">
                  <div className="text-base font-bold">Completeness of Detection</div>
                  <div className="text-md">Reflects the percentage of actual objects the model can identify. More means fewer misses.</div>
                </div>
              </>
            } />
            <CardDataStats title="Precision" score={data?.all.precision} toolTipContent={
              <>
                <div className="px-1 py-2 max-w-md">
                  <div className="text-base font-bold">Correctness of Detection</div>
                  <div className="text-md">Indicates how many of the detected objects were actually correct. High precision reduces false alarms.</div>
                </div>
              </>
            } />
            <CardDataStats title="F1-Score" score={data?.all.f1} toolTipContent={
              <>
                <div className="px-1 py-2 max-w-md">
                  <div className="text-base font-bold">Detection Balance</div>
                  <div className="text-md">Combines recall and precision to judge the model&apos;s overall accuracy. A balanced score is ideal.</div>
                </div>
              </>
            } />
          </div>
        </div>
        <hr className="border-t border-gray-200" />
      </div>
    </>
  );
}

function OverallProblem() {

  const levelmap = {
    "High": { color: "text-[#F31260]", icon: <ExclamationCircleIcon color="#F31260" className="w-5 h-5 mr-2 flex-shrink-0" strokeWidth={2} /> },
    "Low": { color: "text-[#F5A524]", icon: <ExclamationTriangleIcon color="#F5A524" className="w-5 h-5 mr-2 flex-shrink-0" strokeWidth={2} /> },
  }

  const dataOverallProblem = [
    {
      level: "High",
      problem: "Model may overfitting",
      tooltipContent: (<>
        <div className="px-1 py-2 max-w-md">
          <div className="text-base font-bold">Potential Overfitting Alert</div>
          <div className="text-md">The model might be too tailored to the training data, risking poor performance on new data.</div>
        </div>
      </> as React.ReactNode)
    },
    {
      level: "Low",
      problem: "Dataset is not balanced",
      tooltipContent: (<>
        <div className="px-1 py-2 max-w-md">
          <div className="text-base font-bold">Imbalanced Dataset Warning</div>
          <div className="text-md">Classes in the dataset are unevenly distributed, which may bias the model’s performance.</div>
        </div>
      </>
      ) as React.ReactNode
    },
  ];

  return (
    <div className="flex flex-col justify-start">
      <ul>
        {dataOverallProblem.map((data, idx) => (
          <Tooltip key={idx} content={data.tooltipContent}>
            <li key={data.level} className={`flex items-center ${levelmap[data.level as keyof typeof levelmap].color}`}>
              {levelmap[data.level as keyof typeof levelmap].icon}
              <span className="text-md font-semibold">{data.problem}</span>
            </li>
          </Tooltip>
        ))}
      </ul>
    </div>
  );
}

function AllClassAP({ data, isLoading }: { data: IAllClassAP | undefined; isLoading: boolean }) {

  return (
    <div className="flex flex-col flex-grow items-center justify-center">
      <div className="flex items-center">
        <h1 className="text-md font-bold">Average Precision of All Classes&nbsp;(%)</h1>
        <Tooltip  
          content={
            <div className="px-1 py-2 max-w-md">
              <div className="text-base font-bold">Class Precision Overview</div>
              <div className="text-sm break-words">This chart shows the average precision for each class, indicating how accurately the model can identify each specific type of object. Each bar represents the average percentage of correct predictions for that class.</div>
            </div>
          }
        >
          <QuestionMarkCircleIcon className="w-5 h-5 ml-1" />
        </Tooltip>
      </div>
      <div className="w-full overflow-y-auto overflow-x-hidden min-h-auto max-h-80">
        {isLoading
          ? <Spinner aria-label="Loading..." className="w-full h-full flex items-center justify-items-center" />
          : <ChartAllClassAPBar data={data!} />
        }
      </div>
    </div>
  );
}

export function ModelInfo({ projectId, versionId, enableAIChat }: { projectId: number, versionId: number, enableAIChat: boolean }) {

  const { isLoading, isError, data } = useQuery<IModelInfo>({
    queryKey: ['reports', 'modelInfo', versionId],
    queryFn: async () => {
      const response = await fetch(`/api/versions/${versionId}/reports/model-info`);
      return await response.json();
    }
  }
  );
  const keyMappping = {
    modelName: "Model Name",
    // modelType: "Model Type",
    framework: "Framework",
    epochs: "Epochs",
    batchSize: "Batch Size",
    learningRate: "Learning Rate",
  }

  return (
    <>
      <div className="rounded-lg bg-white shadow mb-4 shadow-lg md:mb-6">
        <div className="px-4 py-4 sm:px-6 flex gap-x-2">
          <h1 className="text-2xl font-black mb-2">Model Info</h1>
          {enableAIChat ? (isLoading ? <Spinner aria-label="Loading..." /> : <AIChat userMessage={getModelInfoPrompt(data!.modelName)} />) : null}
        </div>
        <hr className="border-t border-gray-200" />
        {isLoading ? <Spinner aria-label="Loading..." className="w-full h-full flex items-center justify-items-center" /> :
          <div className="px-4 py-4 sm:px-6 flex items-center justify-around min-h-72">
            <Image src="/static/images/Model-Info.png" alt="model-info" className="w-48" />
            {/* <img src="/static/images/Model-Info.png" alt="model-info" className="w-2/5 h-auto" /> Adjusted width and set height to auto */}
            <ul className="list-disc pl-4"> {/* Added padding-left for spacing */}
              {Object.entries(keyMappping).map(([key, value]) => ( // Changed keyMappping.entries to Object.entries
                <li key={key}>
                  <div className="flex items-center py-2">
                    <span className="text-md font-bold">{value}:&nbsp;</span>
                    <span className="text-md">{data![key as keyof IModelInfo]}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        }
      </div>
    </>
  );
}

function GradientBar() {
  return (
    <>
      <div className="flex flex-col justify-center items-center">
        <div className="text-center text-xs font-semibold">More</div>
        <div className="w-4 h-72 bg-gradient-to-t from-white to-red-500 border overflow-hidden">
          <div className="flex-grow" />
        </div>
        <div className="text-center text-xs font-semibold">Less</div>
      </div>
    </>
  );
}

function DataHealthCheck({ projectId, versionId }: { projectId: number, versionId: number }) {



  // const dataDataHealth = {
  //   imagesCount: 387,
  //   annotationsCount: 100,
  //   ratio: {
  //     image: { median: { w: 500, h: 333 }, largest: { w: 1500, h: 666 }, smallest: { w: 200, h: 133 } },
  //     annotation: { median: { w: 100, h: 100 }, largest: { w: 300, h: 233 }, smallest: { w: 20, h: 30 } }
  //   },
  //   nullExamples: [{ img: "image_1" }, { img: "image_2" }, { img: "image_3" }],
  //   trainSplit: {
  //     train: 44, validation: 13, test: 11
  //   },
  //   classDistribution: {
  //     dog: 500, cat: 233, bird: 267
  //   },
  // }

  const [totalData, setTotalData] = useState<number>(0);
  const [mean, setMean] = useState<number>(0);
  const [stdDeviation, setStdDeviation] = useState<number>(0);
  const [proportions, setProportions] = useState<{ [key: string]: number }>({});

  const { isLoading, isError, data } = useQuery<IDataHealth>({
    queryKey: ['reports', 'dataHealthCheck', versionId],
    queryFn: async () => {
      const response = await fetch(`/api/versions/${versionId}/reports/data-health-check`);
      const data: IDataHealth = await response.json();
      const holdTotalData = Object.values(data.classDistribution).reduce((sum, value) => sum + value, 0);
      setTotalData(holdTotalData);

      // Calculate proportions
      const proportions: { [key: string]: number } = {}; // Add index signature
      for (const [category, value] of Object.entries(data.classDistribution)) {
        proportions[category] = value / holdTotalData;
      }

      setProportions(proportions);

      // Calculate the mean proportion
      setMean(Object.values(proportions).reduce((sum, value) => sum + value, 0) / Object.keys(proportions).length);

      // Calculate the standard deviation
      const variance = Object.values(proportions).reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / Object.keys(proportions).length;
      setStdDeviation(Math.sqrt(variance));
      return data;
    }
  }
  );

  // Determine color based on the proportion
  const getColor = (proportion: number) => {
    if (proportion <= mean * 0.66) return 'warning';
    if (proportion >= mean * 1.33) return 'danger';
    return 'primary'; // Default color when within one standard deviation
  };

  return (
    <div className="rounded-lg bg-white shadow mb-4 shadow-lg md:mb-6">
      <div className="px-4 py-4 sm:px-6 flex gap-x-2">
        <h1 className="text-2xl font-black mb-2">Dataset Health Check</h1>
        {isLoading ? <Spinner aria-label="Loading..." /> : <AIChat userMessage={getDataHealthCheckPrompt(data!)} />}
      </div>
      <hr className="border-t border-gray-200" />
      {isLoading
        ? <Spinner aria-label="Loading..." className="w-full h-full flex items-center justify-items-center" />
        : isError
          ? <div>Error</div>
          :
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 mb-4">
            <div className="p-4">
              <CardDataSetStats
                title="Images"
                score={String(data!.imagesCount)}
                toolTipContent={
                  <div className="px-1 py-2 max-w-md">
                    {/* <div className="text-sm font-bold">Custom Content</div> */}
                    <div className="text-md">The total image that has been uploaded</div>
                  </div>
                }>
                <div className="flex items-center text-gray-500">
                  <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                  <div className="text-sm font-bold">{data!.nullExamples.length} images without annotations</div>
                </div>
              </CardDataSetStats>
            </div>
            <div className="p-4">
              <CardDataSetStats
                title="Annotations"
                score={String(data!.annotationsCount)}
                toolTipContent={
                  <div className="px-1 py-2 max-w-md">
                    {/* <div className="text-sm font-bold">Custom Content</div> */}
                    <div className="text-md">The total annotations that has been marked</div>
                  </div>
                }>
                <div className="flex items-center text-gray-500">
                  <ViewfinderCircleIcon className="w-5 h-5 mr-2" />
                  <div className="text-sm font-bold">{Number(data!.annotationsCount / data!.imagesCount).toFixed(2)} per image</div>
                </div>
              </CardDataSetStats>
            </div>
            <div className="p-4">
              <CardDataSetStats
                title="Median Image Ratio"
                score={`${data!.ratio.image.median.w}x${data!.ratio.image.median.h}`}
                toolTipContent={
                  <div className="px-1 py-2 max-w-md">
                    {/* <div className="text-sm font-bold">Custom Content</div> */}
                    <div className="text-md">Shows the typical aspect ratio of images, from the largest to the smallest in the dataset.</div>
                  </div>
                }>
                <div className="flex items-center text-gray-500">
                  <ViewfinderCircleIcon className="w-5 h-5 mr-2" />
                  <div className="flex justify-between gap-6">
                    <div className="text-sm font-bold">Largest: {`${data!.ratio.image.largest.w}x${data!.ratio.image.largest.h}`}</div>
                    <div className="text-sm font-bold">Smallest: {`${data!.ratio.image.smallest.w}x${data!.ratio.image.smallest.h}`}</div>
                  </div>
                </div>
              </CardDataSetStats>
            </div>
            <div className="p-4">
              <CardDataSetStats
                title="Median Annotation Ratio"
                score={`${data!.ratio.annotation.median.w}x${data!.ratio.annotation.median.h}`}
                toolTipContent={
                  <div className="px-1 py-2 max-w-md">
                    {/* <div className="text-sm font-bold">Custom Content</div> */}
                    <div className="text-md">Represents the typical size ratio of annotated objects, helping gauge object scale variability.</div>
                  </div>
                }>
                <div className="flex items-center text-gray-500">
                  <ViewfinderCircleIcon className="w-5 h-5 mr-2" />
                  <div className="flex justify-between gap-6">
                    <div className="text-sm font-bold">Largest: {`${data!.ratio.annotation.largest.w}x${data!.ratio.annotation.largest.h}`}</div>
                    <div className="text-sm font-bold">Smallest: {`${data!.ratio.annotation.smallest.w}x${data!.ratio.annotation.smallest.h}`}</div>
                  </div>
                </div>
              </CardDataSetStats>
            </div>
          </div>
      }

      {/* data distribution field */}
      <div className="p-4 flex flex-col md:flex-row justify-between gap-x-4"> {/* Use flex-row for horizontal layout on larger screens */}
        {isLoading
          ? <Spinner aria-label="Loading..." className="w-full h-full flex items-center justify-items-center" />
          : isError
            ? <div>Error</div>
            :
            <>
              <div className="flex-grow"> {/* Ensures that the content takes up the available space */}
                <div className="flex items-center mb-4"> {/* Vertically centers the header and tooltip */}
                  <h1 className="font-black">Class distribution</h1>
                  <Tooltip
                    content={
                      <div className="px-1 py-2">
                        <div className="text-md">Visual representation of how classes are distributed across the dataset.</div>
                      </div>
                    }
                  >
                    <QuestionMarkCircleIcon className="w-5 h-5 ml-1" />
                  </Tooltip>
                </div>
                {Object.entries(data!.classDistribution).map((data) => (
                  <div key={data[0]} className="flex justify-between my-2"> {/* Adds vertical spacing between progress bars */}
                    <Progress
                      label={data[0]}
                      size="md"
                      value={data[1]}
                      maxValue={totalData}
                      color={getColor(proportions[data[0]])} // Use the color based on the proportion
                      classNames={{
                        base: "max-w-2xl py-1", // Adjust padding for more compact design
                      }}
                      showValueLabel={true}
                    />
                  </div>
                ))}
              </div>
              <ChartDataDistribution data={data!.trainSplit} /> {/* This will automatically take space next to the progress bars */}
            </>
        }
      </div>
    </div>
  )
}

// for testing
const repeatList = (list: any, times: any) => [].concat(...Array(times).fill(list));

export function TrainingStatus({ data, isLoading, enableAIChat}: { data: ITrainingStatus["train_metrics"] | undefined; isLoading: boolean; enableAIChat: boolean}) {

  // const dataTrainingStatus = {
  //   accu: {
  //     train: [0.5, 0.4, 0.3, 0.2, 0.1],
  //     val: [0.6, 0.5, 0.4, 0.3, 0.2]
  //   },
  //   objLoss: {
  //     train: repeatList([0.5, 0.4, 0.3, 0.2, 0.1], 10),
  //     val: repeatList([0.6, 0.5, 0.4, 0.3, 0.2], 10)
  //   },
  //   clsLoss: {
  //     train: [0.5, 0.4, 0.3, 0.2, 0.1],
  //     val: [0.6, 0.5, 0.4, 0.3, 0.2]
  //   },
  //   boxLoss: {
  //     train: [0.5, 0.4, 0.3, 0.2, 0.1],
  //     val: [0.6, 0.5, 0.4, 0.3, 0.2]
  //   }
  // }

  return (
    <div className="rounded-lg bg-white shadow mb-4 shadow-lg md:mb-6">
      <div className="px-4 py-4 sm:px-6 flex gap-x-2">
        <h1 className="text-2xl font-black mb-2">Training Status</h1>
        {/* if enable AI chat is true, show AI chat(show spinner if loading), else not show */}
        {enableAIChat ? (isLoading ? <Spinner aria-label="Loading..." /> : <AIChat userMessage={getTrainStatusPrompt(data!)} />) : null}
      </div>
      <hr className="border-t border-gray-200" />
      <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-1 px-4 py-4">
        <div className="flex justify-center">
          <h1 className="font-bold">mean Average Precision&nbsp;(%)</h1>
          <Tooltip
            content={
              <div className="px-1 py-2 max-w-md">
                <div className="text-base font-bold">mAP (%)</div>
                <div className="text-md">Indicates the model&apos;s average accuracy in detecting objects across various thresholds. Higher values reflect better performance.</div>
              </div>
            }
          >
            <QuestionMarkCircleIcon className="w-5 h-5 ml-1" />
          </Tooltip>
        </div>
        {data === undefined
          ? <Spinner aria-label="Loading..." className="w-full h-full flex items-center justify-items-center" />
          : <ChartPlotAccu data={{ mAP: data.mAP }} />
        }

        <hr className="border-t border-gray-200 mb-8" />

        <div className="flex justify-center">
          <h1 className="font-bold">Box Loss</h1>
          <Tooltip
            content={
              <div className="px-1 py-2 max-w-md">
                <div className="text-base font-bold">Localization Error</div>
                <div className="text-md">Measures the model&apos;s error in predicting the exact locations of objects. Lower values indicate more precise localization.</div>
              </div>
            }
          >
            <QuestionMarkCircleIcon className="w-5 h-5 ml-1" />
          </Tooltip>
        </div>
        {data === undefined
          ? <Spinner aria-label="Loading..." className="w-full h-full flex items-center justify-items-center" />
          : <ChartPlotLoss data={data.box_loss} lossType="box" />
        }

        <hr className="border-t border-gray-200 mb-8" />

        <div className="flex justify-center">
          <h1 className="font-bold">Object Loss</h1>
          <Tooltip
            content={
              <div className="px-1 py-2 max-w-md">
                <div className="text-base font-bold">Detection Confidence Error</div>
                <div className="text-md">Assesses the model&apos;s accuracy in determining whether an object is present. Lower values signify higher confidence accuracy.</div>
              </div>
            }
          >
            <QuestionMarkCircleIcon className="w-5 h-5 ml-1" />
          </Tooltip>
        </div>
        {data === undefined
          ? <Spinner aria-label="Loading..." className="w-full h-full flex items-center justify-items-center" />
          : <ChartPlotLoss data={data.obj_loss} lossType="obj" />
        }

        <hr className="border-t border-gray-200 mb-8" />

        <div className="flex justify-center">
          <h1 className="font-bold">Classification Loss</h1>
          <Tooltip
            content={
              <div className="px-1 py-2 max-w-md">
                <div className="text-base font-bold">Classification Error</div>
                <div className="text-md">Evaluates the model&apos;s accuracy in correctly classifying detected objects. Lower values denote better classification.</div>
              </div>
            }
          >
            <QuestionMarkCircleIcon className="w-5 h-5 ml-1" />
          </Tooltip>
        </div>
        {data === undefined
          ? <Spinner aria-label="Loading..." className="w-full h-full flex items-center justify-items-center" />
          : <ChartPlotLoss data={data.cls_loss} lossType="cls" />
        }

      </div>
      <hr className="border-t border-gray-200" />
    </div>
  )
}

function EvaluationDetail({ projectId, versionId }: { projectId: number, versionId: number }) {
  
  const { isLoading, isError, data } = useQuery<IEvalDetail>({
    queryKey: ['reports', 'evalDetail', versionId],
    queryFn: async () => {
      const response = await fetch(`/api/versions/${versionId}/reports/eval-detail`);
      if (!response.ok) {
        throw new Error('Failed to fetch evaluation detail');
      }
      return response.json();
    }
  }
  );

  return (
    <div className="rounded-lg bg-white shadow mb-4 shadow-lg md:mb-6">
      <div className="px-4 py-4 sm:px-6 flex gap-x-2">
        <h1 className="text-2xl font-black mb-2">Evaluation Detail</h1>
        {isLoading ? <Spinner aria-label="Loading..." /> : <AIChat userMessage={getEvalDetailPrompt(data!)} />}
      </div>
      <hr className="border-t border-gray-200" />
      <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-1 px-4 py-4">
        <div className="flex justify-center">
          <h1 className="font-bold">Confusion Matrix</h1>
          <Tooltip
            content={
              <div className="px-1 py-2 max-w-md">
                <div className="text-base font-bold">Understanding the Confusion Matrix</div>
                <div className="text-md">This matrix compares the predicted classifications of the model (rows) against the actual labels (columns). Each cell shows how many predictions were made for each class versus the true class, highlighting the accuracy and errors of the model. Darker cells indicate more occurrences, helping identify which classes are often confused.</div>
              </div>
            }
          >
            <QuestionMarkCircleIcon className="w-5 h-5 ml-1" />
          </Tooltip>
        </div>
        <div className="flex justify-center">
          <div className="flex-grow">
            {isLoading
              ? <Spinner aria-label="Loading..." className="w-full h-full flex items-center justify-items-center" />
              : isError
                ? <div>Error</div>
                : <ChartConfusionMatrix class_mapping={data!.class_mapping} confusion_matrix={data!.confusion_matrix} versionId={versionId} />
            }
          </div>
          <GradientBar />
        </div>
      </div>
      <hr className="border-t border-gray-200" />
    </div>
  )
}

function Suggestion({ projectId, versionId }: { projectId: number, versionId: number }) {
  const colors = ['bg-yellow-50', 'bg-green-50', 'bg-blue-50', 'bg-indigo-50', 'bg-purple-50', 'bg-pink-50']
  const slides = [{
    title: "Data Balancing",
    suggestion: "Make sure your dataset is balanced and has enough data for each class to avoid biasing the model towards the majority class.",
    img: "/static/images/Data-Balancing.webp"
  },
  {
    title: "Select the Right Pre-trained Model",
    suggestion: "Choose a pre-trained model that aligns closely with the characteristics of your dataset. For example, models pre-trained on similar object classes or environments can yield better results.",
    img: "/static/images/Select-the-Right-Pre-trained-Model.webp"
  },
  {
    title: "Optimize Batch Size",
    suggestion: "Adjust the batch size based on your available computational resources. A larger batch size can provide a more stable estimate of the gradient, but too large might impact the model's ability to generalize.",
    img: "/static/images/Optimize-Batch-Size.webp"
  },
  {
    title: "Fine-tune the Learning Rate",
    suggestion: "Start training with a learning rate that's neither too high nor too low. Consider using different learning rate to find the optimal value for your task.",
    img: "/static/images/Fine-tune-the-Learning-Rate.webp"
  },
  {
    title: "Fine-tune the number of Epochs",
    suggestion: "Monitor the training loss and validation metrics to determine the optimal number of epochs. Early stopping can help prevent overfitting and save time by stopping training when the model's performance plateaus.",
    img: "/static/images/Fine-tune-the-number-of-Epochs.webp"
  },
  {
    title: "Curate Your Dataset",
    suggestion: "Ensure your dataset is well-curated and representative of the scenarios in which the model will operate. Include a diverse range of examples for each class to improve the model's accuracy and robustness.",
    img: "/static/images/Curate-Your-Dataset.webp"
  },
  {
    title: "Data Augmentation",
    suggestion: "Employ data augmentation techniques to artificially expand the variety of your dataset. This can include image rotations, shifts, and changes in scale, which help the model generalize better to new data.",
    img: "/static/images/Data-Augmentation.webp"
  },
  ]
  return (
    <EmblaCarousel>
      {slides.map((slide, index) => (
        <div key={index} className="embla__slide">
          <Card className={`p-4 ${colors[index % colors.length]}`}>
            <CardHeader className="flex justify-between">
              <h3 className="text-lg font-bold">{slide.title}</h3>
            </CardHeader>
            <CardBody className="overflow-visible py-2">
              <div className="flex justify-between">
                <div className="flex flex-col">
                  <p className="font-bold text-md">{slide.suggestion}</p>
                </div>
                <div className="flex-shrink-0"> {/* Add this to prevent image container from shrinking */}
                  <Image
                    alt="Card background"
                    className="object-cover rounded-xl ml-2"
                    src={slide.img}
                    width={200} // Fixed width
                  // height={/* Fixed height value, e.g., 150 */} // Add fixed height
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ))}
    </EmblaCarousel>
  )
}

function ExportModel({ projectId, versionId }: { projectId: number, versionId: number }) {
  // TODO: Implement call API to get which model type is available for download
  // TODO: Implement API that search in models folder and return the available model type
  const [isDownloading, setIsDownloading] = useState(false);

  function getFileNameFromHeader(headers: Headers) {
    const contentDisposition = headers.get('Content-Disposition');
    if (!contentDisposition) return null;
    const matches = /filename="(.+?)"/.exec(contentDisposition);
    return matches ? matches[1] : null;
  }

  async function downloadFile(versionId: number, modelFormat: string) {
    setIsDownloading(true);
    await fetch(`/api/versions/${versionId}/reports/models?model-format=${modelFormat}`)
      .then((response) => {
        const fileName = getFileNameFromHeader(response.headers);
        if (!fileName) {
          throw new Error('File name not found in response header');
          setIsDownloading(false);
        }
        return response.blob().then((blob) => ({ blob, fileName }));
      })
      .then(({ blob, fileName }) => {
        saveAs(blob, fileName);
      });
    setIsDownloading(false);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'modelTypes', versionId],
    queryFn: async () => {
      const response = await fetch(`/api/versions/${versionId}/reports/model-types`);
      if (!response.ok) {
        throw new Error('Failed to fetch model types');
      }
      return response.json();
    },
  });

  const mutation = useMutation({
    mutationFn: ({ modelformat }: { modelformat: string }) => downloadFile(versionId, modelformat),
    onSuccess: () => {
      console.log('File downloaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error downloading the file: ${error}`);
    },
  });

  const modelExports = [
    {
      id: 1,
      name: 'Pytorch Format',
      description: 'Suitable for running on laptops, desktops or servers, run on Pytorch framework',
      href: '#',
      imageSrc: 'https://miro.medium.com/v2/resize:fit:1024/0*RjEV6cCRPerIF8U1.png',
      imageAlt: 'Export as .pt model',
      type: 'pytorch',
      format: '.pt'
    },
    {
      id: 2,
      name: 'TF Format',
      description: 'Suitable for running on laptops, desktops or servers.',
      href: '#',
      imageSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/TensorFlow_logo.svg/1200px-TensorFlow_logo.svg.png',
      imageAlt: 'Front of zip tote bag with white canvas, black canvas straps and handle, and black zipper pulls.',
      type: 'tensorflow',
      format: '.tf'
    },
    {
      id: 3,
      name: 'TFlite Format',
      description: 'Suitable for running on mobile phones',
      href: '#',
      imageSrc: 'https://www.tensorflow.org/static/site-assets/images/project-logos/tensorflow-lite-logo-social.png',
      imageAlt: 'Export as .tflite model',
      type: 'tflite',
      format: '.tflite'
    },
  ]

  return (
    <>
      {/* <div className="mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-2 xl:gap-x-8 justify-items-center"> */}
      {isLoading ? <Spinner aria-label="Loading..." /> :
        <div className="mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-1 sm:gap-x-6 lg:grid-cols-1 xl:gap-x-8 justify-items-center">
          {modelExports.filter((modelExports) => data?.includes(modelExports.format)).map((modelExports) => (
            <div key={modelExports.id}>
              <div className="relative">
                <div className="relative h-72 w-full overflow-hidden rounded-lg">
                  <img
                    src={modelExports.imageSrc}
                    alt={modelExports.imageAlt}
                    className="h-full w-full object-contain object-center"
                  />
                </div>
                <div className="relative mt-4">
                  <h3 className="text-lg font-medium text-gray-900">{modelExports.name}</h3>
                  <p className="mt-1 text-md text-gray-500">{modelExports.description}</p>
                </div>
                <div className="absolute inset-x-0 top-0 flex h-72 items-end justify-end overflow-hidden rounded-lg p-4">
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black opacity-20"
                  />
                </div>
              </div>
              <div className="mt-6">
                <Button type="button" variant="solid" color="blue" className="w-full relative flex items-center justify-center rounded-md border border-transparent bg-[#2563EB] px-8 py-2 text-md font-bold text-white"
                  onClick={() => mutation.mutate({ modelformat: modelExports.format })}
                >
                  {isDownloading ? <div><Spinner aria-label="Loading..." size="sm" color="default" /></div> :
                    <div> Export as {modelExports.format}<span className="sr-only">, {modelExports.name}</span></div>
                  }
                </Button>
              </div>
            </div>
          ))}
        </div>
      }
    </>
  )

}
