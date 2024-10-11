"use client";

import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@nextui-org/react';

interface CardDataSetStatsProps {
  title: string;
  score: string;
  toolTipContent?: React.ReactNode;
  message?: string;
  children?: React.ReactNode;
}

const CardDataSetStats: React.FC<CardDataSetStatsProps> = ({
  title,
  score,
  toolTipContent,
  message,
  children
}) => {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="px-4 py-2 sm:px-4  flex items-center justify-between bg-gray-100">
        <h1 className="font-black text-gray-800">{title}</h1>
        <Tooltip  
        content={toolTipContent}>
          <QuestionMarkCircleIcon data-tooltip-id="mAP_tooltip" className="w-5 h-5 ml-1" />
        </Tooltip>
        {/* We use less vertical padding on card headers on desktop than on body sections */}
      </div>
      <div className="px-4 sm:px-3 sm:py-3">
        <h1 className="text-3xl	font-semibold text-primary text-[#2563EB] mb-1">{score}</h1>
        {children}
      </div>
    </div>
  )
}

export default CardDataSetStats;