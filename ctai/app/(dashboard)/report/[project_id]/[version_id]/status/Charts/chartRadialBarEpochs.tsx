import Chart from "@/app/ui/chart";
import { ApexOptions } from "apexcharts";
import { useEffect } from 'react';
import { Props } from "react-apexcharts";

export interface ChartRadialBarEpochsProps {
    currentEpoch: number;
    totalEpoch: number;
    // start_at: number;
    // ETA: number;
}

const ChartRadialBarEpochs: React.FC<ChartRadialBarEpochsProps> = (data) => {

    // const [remainTime, setRemainTime] = useState(data.ETA);
    // console.log(data.start_at, data.currentEpoch, data.totalEpoch, data.ETA, Date.now(), (Date.now() - (data.start_at * 1000)));
    // const elaspedTime = formatDistanceToNow( (Date.now() - (data.start_at * 1000)) / data.currentEpoch, { includeSeconds: true });
    // console.log(data.currentEpoch, data.totalEpoch, data.start_at, data.ETA, elaspedTime);
    useEffect(() => {
        const style = document.createElement('style');
        document.head.appendChild(style);
        style.textContent = `
            @keyframes gradientFillAnimation {
                0% { stroke: #5690E1; }
                50% { stroke: #67CD32; }
                100% { stroke: #5690E1; }
            }

            .apexcharts-radialbar .apexcharts-series path {
                animation: gradientFillAnimation 3s ease-in-out infinite;
            }
        `;
        // const interval = setInterval(() => {
        //     setRemainTime(remainTime - 1);
        // }, 1000);

        // return () => clearInterval(interval);
    }, []);

    const state = {

        series: [(data.currentEpoch / data.totalEpoch) * 100],
        options: {
            chart: {
                // animations: {
                //     enabled: false
                // },
                height: 350,
            },
            plotOptions: {
                radialBar: {
                    startAngle: 0,
                    endAngle: 360,
                    hollow: {
                        margin: 0,
                        size: '70%',
                        background: '#fff',
                        image: undefined,
                        imageOffsetX: 0,
                        imageOffsetY: 0,
                        position: 'front',
                        dropShadow: {
                            enabled: true,
                            top: 3,
                            left: 0,
                            blur: 4,
                            opacity: 0.24
                        }
                    },
                    track: {
                        background: '#fff',
                        strokeWidth: '67%',
                        margin: 0, // margin is in pixels
                        dropShadow: {
                            enabled: true,
                            top: -3,
                            left: 0,
                            blur: 4,
                            opacity: 0.35
                        }
                    },

                    dataLabels: {
                        show: true,
                        name: {
                            offsetY: -10,
                            show: true,
                            color: '#888',
                            fontSize: '17px'
                        },
                        value: {
                            formatter: function (val) {
                                return `${Math.round(val * data.totalEpoch / 100)} / ${data.totalEpoch}`
                            },
                            color: '#111',
                            fontSize: '36px',
                            show: true,
                        }
                    }
                }
            },
            // fill: {
            //     type: 'image',
            //     image: {
            //         src: ['/static/background-auth.jpg'],
            //     }
            // },
            stroke: {
                lineCap: 'round'
            },
            labels: ['Epochs'],
        } as ApexOptions,
        type: "radialBar" as Props["type"]

    };

    return (
        // <div className="nextui-circular-progress-track">
        <Chart options={state.options} series={state.series} type={state.type} height={250} />
        // </div>
    );
}
export default ChartRadialBarEpochs;