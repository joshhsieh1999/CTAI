import Chart from "@/app/ui/chart";
import { ApexOptions } from "apexcharts";
import { Props } from "react-apexcharts";

interface ChartDataDistributionProps {
    data: {
        train: number;
        validation: number;
        test: number;
    }
}

const ChartDataDistribution: React.FC<ChartDataDistributionProps> = ({ data }) => {

    const state = {
        series: [{
            name: 'Training Data',
            data: [data.train]
        }, {
            name: 'Validation Data',
            data: [data.validation]
        }, {
            name: 'Test Data',
            data: [data.test]
        }],
        options: {
            chart: {
                height: '100%',
                stacked: true,
                stackType: '100%' as '100%'
            },
            grid: {
                show: false,
            },
            xaxis: {
                categories: ['W1'],
                show: false,
                labels: {
                    show: false
                },
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                }
            },
            // fill: {
            //     opacity: 1
            // },
            legend: {
                position: 'right' as 'right',
                offsetX: 0,
                // offsetY: 50
                height: undefined,
                inverseOrder: true, // 嘗試反轉圖例順序
            },
            yaxis: {
                show: false,
                labels: {
                    show: false,
                },
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
                crosshairs: {
                    show: false,
                },
                tooltip: {
                    enabled: false,
                },

            },
            plotOptions: {
                bar: {
                    // borderRadius: 10, // 設定圓角大小，根據需要調整
                    // endingShape: 'rounded', // 結束的形狀為圓角
                    // startingShape: 'rounded', // 開始的形狀為圓角
                    columnWidth: '100%',
                }
            },
            tooltip: {
                enabled: false
            },
            colors: ['#687EFF', '#80B3FF', '#98E4FF'],
            dataLabels: {
                enabled: true,
                style: {
                    fontSize: '18px', // Increase the font size here
                    colors: ['#fff'] // Ensure the label color contrasts with the bar color
                }
            },

        } as ApexOptions,

        type: "bar" as Props["type"]
    };

    return (
        <>
            <Chart options={state.options} series={state.series} type={state.type} />
        </>
    );
}
export default ChartDataDistribution;
