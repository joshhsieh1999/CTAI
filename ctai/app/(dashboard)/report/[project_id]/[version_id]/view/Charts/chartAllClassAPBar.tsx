import { IAllClassAP } from "@/app/api/versions/[versionId]/reports/all-class-AP/route";
import Chart from "@/app/ui/chart";
import { ApexOptions } from "apexcharts";
import { Props } from "react-apexcharts";

interface chartALLClassAPBarProps {
    data: IAllClassAP;
}

const ChartAllClassAPBar: React.FC<chartALLClassAPBarProps> = ({ data }) => {
    // filter out data["all"]
    const labels  = Object.keys(data).filter((item) => item !== "all");
    const chartData = labels.map(key => data[key].mAP * 100);
    // Rest of the code...
    const state = {
        series: [{
            data: chartData
        }],
        options: {
            plotOptions: {
                bar: {
                    distributed: true,
                    borderRadius: 4,
                    borderRadiusApplication: 'end',
                    horizontal: true,
                    dataLabels: {
                        position: 'top',
                    },
                    enableShades: false
                }
            },
            dataLabels: {
                enabled: true,
                formatter: function (val: number) {
                    return val.toFixed(2) + '%'; // Appends the percentage sign
                },
                offsetX: -20,
                style: {
                    fontSize: '12px',
                    colors: ["#fff"]
                }
            },
            xaxis: {
                categories: labels,
                max: 100,
            },
            yaxis: {
                labels: {
                    style: {
                        colors: '#333',
                        fontSize: '16px',
                        fontWeight: 500
                    }
                },
            },
            tooltip: {
                enabled: false
            },
            // colors: ['#33b2df', '#546E7A', '#d4526e', '#13d8aa'], // Array of colors for the bars

        } as ApexOptions,
        type: "bar" as Props["type"]
    };

    return (
        <Chart options={state.options} series={state.series} type={state.type} height={Math.max(250, state.series[0].data.length * 40)} />
    );
}
export default ChartAllClassAPBar;