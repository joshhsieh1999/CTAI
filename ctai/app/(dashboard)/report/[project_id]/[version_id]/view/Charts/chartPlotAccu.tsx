import Chart from "@/app/ui/chart";
import { ApexOptions } from "apexcharts";
import { Props } from "react-apexcharts";

interface ChartPlotAccuProps {
  data: {
    mAP: number[];
  }
}
    
const ChartPlotAccu: React.FC<ChartPlotAccuProps> = ({ data }) => {
  const tickScales = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const tickScale = tickScales.find(x => (data.mAP.length / x) <= 10) ?? data.mAP.length;

  const state = {

    series: [{
      name: 'mAP',
      data: data.mAP.map(x => x * 100)
    }],
    options: {
      chart: {
        id: 'id-chartPlotAccu',
        height: 350,
        type: 'area',
        toolbar: {
          show: true
        }
      },
      // title: {
      //   text: 'Accuracy',
      //   align: 'center',
      //   style: {
      //     fontSize: '16px',
      //     fontWeight: 'bold',
      //     color: '#333'
      //   }
      // },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth'
      },
      xaxis: {
        type: 'numeric',
        tickAmount: data.mAP.length - 1, // Adjust this value based on your data
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
          text: 'Accuracy (%)',
          style: {
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333'
          }
        },
        labels: {
          formatter: (value: number) => `${value.toFixed(2)}`
        }
      },
      tooltip: {
        x: {
          formatter: (val: any) => `Epoch ${Math.round(val)}` // Ensure integer epoch values
        },
      },
    } as ApexOptions,
    type: "area" as Props["area"]


  };

  return (
    <>
      <Chart options={state.options} series={state.series} type={state.type} />
    </>
  );
}
export default ChartPlotAccu;
