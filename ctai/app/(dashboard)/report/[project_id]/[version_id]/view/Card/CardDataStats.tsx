"use client";

import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { Spinner, Tooltip } from '@nextui-org/react';
import React from 'react';

interface CardDataStatsProps {
  title: string;
  score: number | undefined;
  toolTipContent?: React.ReactNode;
}

const CardDataStats: React.FC<CardDataStatsProps> = ({
  title,
  score,
  toolTipContent,
}) => {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="px-4 py-3 sm:px-4  flex justify-between bg-gray-100">
        <h1 className="font-black">{title}</h1>
        <Tooltip
          content={toolTipContent}>
          <QuestionMarkCircleIcon data-tooltip-id="mAP_tooltip" className="w-5 h-5 ml-1" />
        </Tooltip>
        {/* We use less vertical padding on card headers on desktop than on body sections */}
      </div>
      <div className="px-4 py-2 sm:p-3 flex items-end justify-center">
        {score === undefined ? (
          <Spinner />
        ) : (
          <>
            <h1 className="text-5xl	font-semibold text-primary text-[#2563EB]">{(score * 100).toFixed(2)}</h1>
            <h1 className="text-xl	font-semibold text-primary">%</h1>
          </>
        )}
      </div>
    </div>
  )
}

export default CardDataStats;