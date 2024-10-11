import Chart from "@/app/ui/chart";
import { ApexOptions } from "apexcharts";
import { Props } from "react-apexcharts";

interface ChartPlotLossProps {
    train: number[];
    val: number[];
}

const ChartPlotLoss: React.FC<{ data: ChartPlotLossProps, lossType: "box" | "cls" | "obj" }> = ({ data, lossType }) => {
  const tickScales = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const tickScale = tickScales.find(x => (data.train.length / x) <= 10) ?? data.train.length;

  const state = {

    series: [{
      name: 'Train',
      data: data.train
    }, {
      name: 'Validation',
      data: data.val
    }],
    options: {
      chart: {
        id: `id-chartPlotLoss-${lossType}`,
        height: 350,
        toolbar: {
          show: true
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth'
      },
      xaxis: {
        type: 'numeric',
        tickAmount: data.train.length - 1, // Adjust this value based on your data
        labels: {
          formatter: (val: string) => {
            return Number(val) === 1 ? '1' : ((Number(val) % tickScale) === 0 ? val : '')
          }
        },
        title: {
          text: 'Epochs',
          offsetY: -15,
          style: {
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333'
          }
        }
      },
      yaxis: {
        // decimalsInFloat: 2, // Limit to two decimal places
        title: {
          text: 'Loss',
          style: {
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333'
          }
        },
        labels: {
          formatter: (value: number) => `${value.toFixed(2)}` // Format with 2 decimal places and '%'
        }
      },
      tooltip: {
        x: {
          formatter: (val: any) => `Epoch ${Math.round(val)}` // Ensure integer epoch values
        },
      },
    } as ApexOptions,
    type: "area" as Props["type"]
  };

  return (
    <Chart options={state.options} series={state.series} type={state.type} />
  );
}
export default ChartPlotLoss;
