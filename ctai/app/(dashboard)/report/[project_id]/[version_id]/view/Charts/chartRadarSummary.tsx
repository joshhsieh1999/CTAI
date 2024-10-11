import Chart from "@/app/ui/chart";
import { Props } from "react-apexcharts";

const state = {

    series: [{
        name: 'Series 1',
        data: [80, 50, 30, 40, 100, 20],
    }],
    options: {
        chart: {
            // height: 350,
            // width: 1000,
        },
        // title: {
        //     text: 'Basic Radar Chart'
        // },
        xaxis: {
            categories: ['January', 'February', 'March', 'April', 'May', 'June']
        }
    },
    type: "radar" as Props["type"]
};

const ChartRadarSummary: React.FC = () => {
    return (
        <>
            <Chart options={state.options} series={state.series} type={state.type} />
        </>
    );
}
export default ChartRadarSummary;
