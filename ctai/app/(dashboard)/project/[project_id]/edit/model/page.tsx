'use client'

// import { Button } from '@/app/ui/catalyst/button';

import { CubeTransparentIcon } from '@heroicons/react/24/outline';

import { DatasetSettings, ModelSettings } from '@/app/api/versions/[versionId]/train/route';
import ProjectLayout from '@/app/ui/project/layout';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Spinner } from "@nextui-org/react";
import type { Selection } from '@react-types/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

interface Models {
  id: number;
  modelName: string;
  modelType: string;
}

export default function EditModel() {
  const params = useParams();
  const projectId = Number(params.project_id);
  const route = useRouter();
  const queryClient = useQueryClient();
  const [models, setModels] = useState<Models[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<Number>(0);
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    modelId: 0,
    learningRate: 0.001,
    epochs: 10,
    batchSize: 16,
  });
  const [datasetSettings, setDatasetSettings] = useState<DatasetSettings>({
    train: 0.7,
    val: 0.2,
    test: 0.1,
  });

  const { data, error, isLoading } = useQuery({
    queryKey: ['projects', projectId, 'models'],
    queryFn: async () => {
      const response = await fetch(`/api/models/projects/${projectId}`);
      const data = await response.json();
      setModels(data);
      setSelectedModelId(Number(data[0].id));
      return data;
    },
    enabled: !!projectId,
  });

  const mutation = useMutation({
    mutationFn: ({ gotoStatus }: { gotoStatus: string }) => {
      const versionId = localStorage.getItem('editingVersionId');
      return fetch(`/api/versions/${versionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: gotoStatus == 'done' ? 'Pending' : 'Editing:dataset',
        }),
      });
    },
    onSuccess: async (data: Response, variables: { gotoStatus: string }) => {
      await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'versions'], refetchType: 'all' })
      route.push(`/project/${projectId}/edit/${variables.gotoStatus}`)
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  });

  const trainMutation = useMutation({
    mutationFn: async () => {
      const versionId = localStorage.getItem('editingVersionId');
      const response = await fetch(`/api/versions/${versionId}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelSettings: { ...modelSettings, modelId: selectedModelId },
          datasetSettings: datasetSettings,
        }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    onSuccess: async (data: Response) => {
      await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'versions'], refetchType: 'all' })
      route.push(`/project/${projectId}/edit/done`)
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  });

  const handleSelectionChange = (keys: Selection) => {
    const modelId = Number((keys as Set<string>).values().next().value)
    setSelectedModelId(modelId);
  }

  return (
    <ProjectLayout>
      <div className="mx-auto max-w-lg">
        <div>
          <div className="text-center">
            <CubeTransparentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h1 className="mt-2 text-base font-semibold leading-6 text-gray-900">Add / Manage your dataset</h1>
            <p className="mt-1 text-sm text-gray-500">
              Select and Configure model for your project.
            </p>
          </div>
        </div>
        <div className="mt-10">
          <form className="space-y-12">
            <div className="border-b border-gray-900/10 pb-12">
              <h2 className="text-base font-semibold leading-7 text-gray-900">Model Select</h2>
              <div className="mt-10">
                <label htmlFor="model-select" className="block text-sm font-medium leading-6 text-gray-900 mb-4">
                  Choose a Model
                </label>
                {isLoading ?
                  <Spinner className="flex justify-center items-center h-12" />
                  :
                  <>
                    <Dropdown
                      type="listbox"
                    >
                      <DropdownTrigger>
                        <Button
                          variant="bordered"
                          className="capitalize"
                        >
                          <div className="flex items-center gap-x-2">
                            <span>{models.find((model) => model.id == selectedModelId)?.modelName}</span>
                            <ChevronDownIcon className="h-4 w-4" />
                          </div>
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label="Single selection example"
                        variant="solid"
                        disallowEmptySelection
                        selectionMode="single"
                        selectedKeys={new Set([selectedModelId.toString()])}
                        onSelectionChange={handleSelectionChange}
                      >
                        {models.map((model) => (
                          <DropdownItem key={model.id}>{model.modelName}</DropdownItem>
                        ))}
                      </DropdownMenu>
                    </Dropdown>
                  </>
                }
              </div>
            </div>

            <div className="border-b border-gray-900/10 pb-12">
              <h2 className="text-base font-semibold leading-7 text-gray-900">Model Settings</h2>
              <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
                <div>
                  <label htmlFor="learning-rate" className="block text-sm font-medium leading-6 text-gray-900">
                    Learning Rate
                  </label>
                  <input type="number" id="learning-rate" name="learningRate"
                    className="mt-2 block w-full rounded-md border-0 py-1.5 pl-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="0.001" onChange={(e) => setModelSettings((prev) => ({ ...prev, learningRate: Number(e.target.value) }))} />
                </div>
                <div>
                  <label htmlFor="epochs" className="block text-sm font-medium leading-6 text-gray-900">
                    Epochs
                  </label>
                  <input type="number" id="epochs" name="epochs"
                    className="mt-2 block w-full rounded-md border-0 py-1.5 pl-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="10" onChange={(e) => setModelSettings((prev) => ({ ...prev, epochs: Number(e.target.value) }))} />
                </div>
                <div>
                  <label htmlFor="batch-size" className="block text-sm font-medium leading-6 text-gray-900">
                    Batch Size
                  </label>
                  <input type="number" id="batch-size" name="batchSize"
                    className="mt-2 block w-full rounded-md border-0 py-1.5 pl-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="16" onChange={(e) => setModelSettings((prev) => ({ ...prev, batchSize: Number(e.target.value) }))} />
                </div>
              </div>
            </div>

            {/* Datset Settings */}
            <div className="border-b border-gray-900/10 pb-12">
              <h2 className="text-base font-semibold leading-7 text-gray-900">Dataset Settings</h2>
              <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
                <div>
                  <label htmlFor="train-split" className="block text-sm font-medium leading-6 text-gray-900">
                    Train Split
                  </label>
                  <input type="number" id="train-split" name="trainSplit"
                    className="mt-2 block w-full rounded-md border-0 py-1.5 pl-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="0.7" onChange={(e) => setDatasetSettings((prev) => ({ ...prev, train: Number(e.target.value) }))} />
                </div>
                <div>
                  <label htmlFor="val-split" className="block text-sm font-medium leading-6 text-gray-900">
                    Validation Split
                  </label>
                  <input type="number" id="val-split" name="valSplit"
                    className="mt-2 block w-full rounded-md border-0 py-1.5 pl-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="0.2" onChange={(e) => setDatasetSettings((prev) => ({ ...prev, val: Number(e.target.value) }))} />
                </div>
                <div>
                  <label htmlFor="test-split" className="block text-sm font-medium leading-6 text-gray-900">
                    Test Split
                  </label>
                  <input type="number" id="test-split" name="testSplit"
                    className="mt-2 block w-full rounded-md border-0 py-1.5 pl-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="0.1" onChange={(e) => setDatasetSettings((prev) => ({ ...prev, test: Number(e.target.value) }))} />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-x-6">
              <Button
                onClick={() => mutation.mutate({ gotoStatus: 'dataset' })}
                type="button"
                color='primary'
                className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
              >
                Previous
              </Button>
              <Button
                // href={`/project/${projectId}/edit/done`}
                onClick={() => trainMutation.mutate()}
                type="button"
                color='primary'
                className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
              >
                Start Training
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ProjectLayout>
  )
}
