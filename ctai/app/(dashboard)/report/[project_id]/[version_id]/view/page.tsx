'use client'
import DashLayout from "@/app/ui/dashboard/layout";
import ReportDashboard from "./reportDashboard";

export default function Reports() {
    return (
        <DashLayout bg={"bg-slate-100"}>
            {/* <h1 className="text-3xl font-bold tracking-tight mb-8 sm:-ml-1 lg:-ml-2 lg:px-0">Report</h1> */}
            {/* <Chart options={lineChartData.options} series={lineChartData.series} type={lineChartData.type} /> */}
            {/* <Chart options={donutChartOptions.options} series={donutChartOptions.series} type={donutChartOptions.type} /> */}
            {/* <Chart options={confusionMatrixOptions.options} series={confusionMatrixOptions.series} type={confusionMatrixOptions.type} /> */}
            <ReportDashboard />
        </DashLayout>
    )
}
