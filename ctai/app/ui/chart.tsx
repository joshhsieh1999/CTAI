'use client'

import { Spinner } from "@nextui-org/react";
import { ApexOptions } from 'apexcharts';
import _ from 'lodash';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Props } from 'react-apexcharts';

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function Chart({ options, series, type, height = 350 }: { options: ApexOptions, series: any, type: Props["type"], height?: number }) {
  const defaultOptions: ApexOptions = {
    // Define your chart options here
    chart: {
      toolbar: {
        show: false
      }
    },
  };

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);
  const updatedOptions = _.merge(defaultOptions, options);

  return (
    isLoading
      ? <div className="flex justify-center items-center">
        <Spinner aria-label="Loading..." />
      </div>
      : <div>
        <ApexChart
          options={updatedOptions}
          series={series}
          type={type}
          width={"100%"}
          height={height}
        />
      </div>
  );
};
