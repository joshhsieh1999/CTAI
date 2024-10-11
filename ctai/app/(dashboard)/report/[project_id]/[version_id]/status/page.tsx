'use client'
// import "@/app/css/nextuiProgressBar.css";
import { IModelInfo } from "@/app/api/versions/[versionId]/reports/model-info/route";
import { ITrainingStatus } from "@/app/api/versions/[versionId]/reports/training-status/route";
import { IVersionDetail } from "@/app/api/versions/[versionId]/route";
import DashLayout from "@/app/ui/dashboard/layout";
import { Spinner } from "@nextui-org/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDate, formatDistanceToNow, formatDuration, intervalToDuration } from 'date-fns';
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ModelInfo, TrainingStatus } from "../view/reportDashboard";
import ChartRadialBarEpochs, { ChartRadialBarEpochsProps } from "./Charts/chartRadialBarEpochs";




export default function Status() {
    const router = useRouter();
    const { project_id: projectId, version_id: versionId } = Object.fromEntries(
        Object.entries(useParams<{ project_id: string; version_id: string }>()).map(([k, v]) => [k, +v]));

    const [loading, setloading] = useState(true);
    const [info, setInfo] = useState<ITrainingStatus | null>(null);

    const { data: modelInfo, isLoading: modelInfoisLoading } = useQuery<IModelInfo>({
        queryKey: ['reports', 'modelInfo', versionId],
        queryFn: async () => {
            const response = await fetch(`/api/versions/${versionId}/reports/model-info`);
            return await response.json();
        }
    }
    );

    useEffect(() => {
        mutation.mutate();
        const interval = setInterval(() => {
            mutation.mutate();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // TODO: fetch status and info all from parsed log
    const mutation = useMutation<ITrainingStatus>({
        mutationKey: ['reports', 'trainingStatus', versionId, 'status'],
        mutationFn: async () => {
            const trainingInfo = await fetch(`/api/versions/${versionId}/reports/training-status`);

            // if version is finished, redirect to view page
            const versionDetail = await fetch(`/api/versions/${versionId}`);
            const versionStatus = await versionDetail.json().then((data: IVersionDetail) => data.status);
            if (versionStatus === 'Finish') {
                router.push(`/report/${projectId}/${versionId}/view`);
            }
            // if version is not finished, but training info is not found, raise error
            if (!trainingInfo.ok) {
                // another error except 404
                throw new Error('Failed to fetch project');
            }
            return trainingInfo.json();
        },
        onSuccess: (data) => {
            // for testing, generate random data
            // data.info.cur_epoch = Math.floor(Math.random() * 50);
            // data.info.ETA = Math.floor(Math.random() * 1000);
            // data.status.status.mAP = Array.from({ length: 100 }, () => Math.random());
            // data.status.status.obj_loss.train = Array.from({ length: 100 }, () => Math.random());
            // data.status.status.cls_loss.val = Array.from({ length: 100 }, () => Math.random());
            // data.status.status.box_loss.val = Array.from({ length: 100 }, () => Math.random());
            // 
            setInfo(data);
            setloading(false);
            // ApexCharts.exec('id-chartPlotAccu', 'updateSeries', [{
            //     data: data.status.status.mAP.map(x => x * 100)
            // }])
            // ApexCharts.exec('id-chartPlotLoss-box', 'updateSeries', [{
            //     name: 'Train',
            //     data: data.status.status.box_loss.train
            // },
            // {
            //     name: 'Validation',
            //     data: data.status.status.box_loss.val
            // }
            // ])
            // ApexCharts.exec('id-chartPlotLoss-obj', 'updateSeries', [{
            //     name: 'Train',
            //     data: data.status.status.obj_loss.train
            // },
            // {
            //     name: 'Validation',
            //     data: data.status.status.obj_loss.val
            // }
            // ])
            // ApexCharts.exec('id-chartPlotLoss-cls', 'updateSeries', [{
            //     name: 'Train',
            //     data: data.status.status.cls_loss.train
            // },
            // {
            //     name: 'Validation',
            //     data: data.status.status.cls_loss.val
            // }
            // ])
        },
        onError: (error) => {
            console.error(error);
        }
    });

    return (
        <DashLayout bg={"bg-slate-100"}>
            <h1 className="text-3xl font-black tracking-tight mb-8 sm:-ml-1 lg:-ml-2 lg:px-0">Status</h1>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-white shadow mb-4 shadow-lg md:mb-6 min-h-72">
                    <div className="px-4 py-4 sm:px-6">
                        <h1 className="text-2xl font-black mb-2">Training Info</h1>
                    </div>
                    <hr className="border-t border-gray-200" />
                    {modelInfoisLoading
                        ? <Spinner aria-label="Loading..." className="w-full h-full flex items-center justify-items-center" />
                        : <RuntimeTrainingInfo data={info} totalEpoch={modelInfo?.epochs}/>
                    }
                </div>
                <ModelInfo projectId={projectId} versionId={versionId}  enableAIChat={false}/>
            </div>
            <TrainingStatus data={info?.train_metrics} isLoading={loading} enableAIChat={false}/>
        </DashLayout>
    )
}

function RuntimeTrainingInfo({ data, totalEpoch }: { data: ITrainingStatus | null, totalEpoch: number | undefined }) {
    const chartData: ChartRadialBarEpochsProps = {
        currentEpoch: data?.cur_epoch || 0,
        totalEpoch: totalEpoch || 0,
    }

    const [remainingTime, setRemainingTime] = useState(data?.ETA || 0);
    const [displayTime, setDisplayTime] = useState('');

    useEffect(() => {
        if (!data?.ETA) {
            return;
        }
        // set the initial remaining time to ETA + 60 seconds to space out the time for the model transform
        setRemainingTime(data.ETA + 60);

        const calculateRemainingTime = () => {
            setRemainingTime((prevTime: number) => {
                if (prevTime < 60) {
                    setDisplayTime('less than a minute');
                    clearInterval(interval);
                } else {
                    const duration = intervalToDuration({ start: 0, end: prevTime * 1000 });
                    setDisplayTime(formatDuration(duration, { delimiter: ', ' }));
                }
                return prevTime - 1;
            });
        };

        const interval = setInterval(calculateRemainingTime, 1000);

        // Initial calculation to set the timer immediately
        calculateRemainingTime();

        // Cleanup the interval on component unmount
        return () => clearInterval(interval);
    }, [data?.ETA]);


    return (
        <div className="flex items-center justify-around p-4 min-h-72">
            <div className="relative">
                <ChartRadialBarEpochs {...chartData} />
                <div className="absolute inset-x-0 mx-auto top-24 grid place-items-center z-10">
                    {/* <p><br /><br /><br /><br /><br />Remaining time<br />{timePass} </p> */}
                </div>
            </div>

            <div>
                {data?.start_at
                    ?
                    <ul className="list-disc pl-4">
                        <li key={"Started time"}> <div className="py-2"> <p className="text-md font-bold">Started time: </p> {formatDate(data.start_at * 1000, 'yyyy-MM-dd HH:mm:ss')} </div> </li>
                        <li key={"Elapsed time"}> <div className="py-2"> <p className="text-md font-bold">Elapsed time: </p>{formatDistanceToNow(data.start_at * 1000, { includeSeconds: true })} </div> </li>
                        <li key={"Remained time"}> <div className="py-2"> <p className="text-md font-bold">Remained time: </p>{displayTime} </div> </li>
                    </ul>
                    :
                    <p className="text-md font-bold">Running initial setup...</p>
                }
                {/* <div>
                <CircularProgress
                    label="Speed"
                    // size="full"
                    value={70}
                    // color="success"
                    formatOptions={{ style: "unit", unit: "kilometer" }}
                    showValueLabel={true}
                    classNames={{
                        base: "w-full h-full",
                        svg: "w-36 h-36 drop-shadow-md",
                        indicator: `nextui-circular-progress-track`,
                    }}
                />
            </div> */}
                {/* <Progress
                // isStriped
                aria-label="Loading..."
                color="primary"
                value={data.cur_epoch / data.total_epoch * 100}
                classNames={{
                    base: "max-w-md",
                    indicator: `nextui-progress-track`,
                }}
            /> */}
            </div>
        </div>
    );
}
