import { IAnnotation, IEvalDetail } from "@/app/api/versions/[versionId]/reports/eval-detail/route";
import Chart from "@/app/ui/chart";
import { Image, Modal, ModalBody, ModalContent, ModalHeader, Skeleton, useDisclosure, Pagination } from "@nextui-org/react";
import { useMutation } from "@tanstack/react-query";
import { ApexOptions } from "apexcharts";
import { useState, useEffect } from "react";
import { Props } from "react-apexcharts";
import { toast } from "react-toastify";
interface ChartConfusionMatrixProps extends IEvalDetail {
    versionId: number;
}

interface ICell {
    truthIdx: number;
    predictIdx: number;
    value: Array<IAnnotation>;
}

interface IImgsrc {
    name: string;
    content: string;
}

const ChartConfusionMatrix: React.FC<ChartConfusionMatrixProps> = ({ class_mapping: classMapping, confusion_matrix: matrix, versionId }) => {
    let series = [];
    let labelArray = Object.keys(classMapping).map(key => classMapping[key]);
    labelArray.push('Background');

    for (let i = 0; i < labelArray.length; i++) {
        let data = [];
        for (let j = 0; j < labelArray.length; j++) {
            data.push({ x: labelArray[j], y: matrix[i][j].length });
        }
        series.push({
            name: labelArray[i],
            data: data
        });
    }

    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const { isOpen: isImgOpen, onOpen: onImgOpen, onOpenChange: onImgOpenChange } = useDisclosure();
    const [selectedcell, setSelectedCell] = useState<ICell | null>();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [selectedImg, setSelectedImg] = useState<IAnnotation | undefined>();
    const [imgSrcs, setImgSrcs] = useState<Array<IImgsrc>>([]);
    const [selectedImgIdx, setSelectedImgIdx] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 24; // 每页显示的图像数量

    const mutation = useMutation({
        mutationFn: async ({ cell, page }: { cell: ICell, page: number }) => {
            onOpen();
            setIsLoading(true);
            setImgSrcs([]); // 清空图像以避免显示之前的图像
            const jsonImagesData =
                cell.value.map(item => ({
                    "name": item.img,
                    "gtBbox": {
                        "labelName": labelArray[cell.truthIdx] === 'Background' ? null : labelArray[cell.truthIdx],
                        "bbox": item.gtBbox ? item.gtBbox : null
                    },
                    "pdBbox": {
                        "labelName": labelArray[cell.predictIdx] === 'Background' ? null : labelArray[cell.predictIdx],
                        "bbox": item.pdBbox ? item.pdBbox : null
                    }
                }
                ))

            console.log('jsonImagesData', { "images": jsonImagesData });
            const response = await fetch(`/api/versions/${versionId}/reports/images`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "images": jsonImagesData.slice((page - 1) * itemsPerPage, page * itemsPerPage) // 仅请求当前页的图像
                }),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response;
        },
        onSuccess: (data, variables, context) => {
            console.log(data);
            data.json().then((res) => {
                console.log(res);
                setImgSrcs(res.images);
            }
            ).then(() => setIsLoading(false));
        },
        onError: (error, variables, context) => {
            toast.error('Fetch Images Error');
        }
    });

    const state = {
        series: series,
        options: {
            chart: {
                events: {
                    dataPointSelection: (event: any, chartContext: any, config: any) => {
                        console.log(chartContext, config);
                        const predictIdx = config.seriesIndex;
                        const truthIdx = config.dataPointIndex;
                        console.log(matrix[predictIdx][truthIdx]);
                        console.log(typeof matrix[predictIdx][truthIdx]);
                        console.log(typeof matrix[predictIdx][truthIdx][0]);
                        if (matrix[predictIdx][truthIdx].length > 0) {
                            setSelectedCell({ predictIdx, truthIdx, value: matrix[predictIdx][truthIdx] });
                            mutation.mutate({ cell: { predictIdx, truthIdx, value: matrix[predictIdx][truthIdx] }, page: currentPage });
                        }
                    }
                },
                height: 350,
            },
            xaxis: {
                categories: labelArray,
                title: {
                    text: 'Truth', // 设置X轴的标题
                    style: {
                        color: '#333', // 可选，定义标题颜色
                        fontSize: '18px', // 可选，定义字体大小
                        fontFamily: 'Helvetica, Arial, sans-serif', // 可选，定义字体
                        fontWeight: 600, // 可选，定义字体粗细
                        cssClass: 'apexcharts-xaxis-title' // 可选，自定义 CSS 类
                    }
                },
                labels: {
                    show: true,
                    style: {
                        fontSize: '16px',
                    }
                }
            },
            yaxis: {
                categories: labelArray,
                reversed: true,
                title: {
                    text: 'Predict', // 设置Y轴的标题
                    style: {
                        color: '#333', // 可选，定义标题颜色
                        fontSize: '18px', // 可选，定义字体大小
                        fontFamily: 'Helvetica, Arial, sans-serif', // 可选，定义字体
                        fontWeight: 600, // 可选，定义字体粗细
                        cssClass: 'apexcharts-xaxis-title' // 可选，自定义 CSS 类
                    }
                },
                labels: {
                    show: true,
                    style: {
                        fontSize: '16px',
                    }
                }
            },
            plotOptions: {
                heatmap: {
                    enableShades: true,
                    shadeIntensity: 0.5,
                    radius: 0,
                    useFillColorAsStroke: false,
                }
            },
            dataLabels: {
                enabled: true,
                formatter: function (val, opts) {
                    const { seriesIndex, dataPointIndex, w } = opts;
                    const labelX = w.config.xaxis.categories[dataPointIndex];
                    const labelY = w.config.series[seriesIndex].name;
                    // if is the background/background, so we need to skip it.
                    if (labelX === 'Background' && labelY === 'Background') {
                        return 'X';
                    }

                    return val;
                },
                style: {
                    colors: ['#700'], // 假设只有最高区间使用白色
                    fontSize: '24px',
                }
            },
            stroke: {
                width: 1
            },
            // title: {
            //     text: 'Confusion Matrix',
            // },
            tooltip: {
                custom: function ({ series, seriesIndex, dataPointIndex, w }) {
                    // Directly return the HTML for the tooltip
                    return `<div class="tooltip">
                    <div><span class="font-bold">Predict:</span> ${w.config.series[seriesIndex].name}</div> 
                    <div><span class="font-bold">Truth:</span> ${w.config.xaxis.categories[dataPointIndex]}</div>
                            </div>`;
                }
            },
            colors: ['#ff2020'],
        } as ApexOptions,
        type: 'heatmap' as Props["type"]
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        if (selectedcell) {
            mutation.mutate({ cell: selectedcell, page });
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setCurrentPage(1); // 重置为第一页
        }
    }, [isOpen]);

    return (
        <>
            <Chart options={state.options} series={state.series} type={state.type} />
            <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Images</ModalHeader>
                            <ModalBody>
                                < div className="grid grid-cols-8 gap-4 w-full h-4/5">
                                    {isLoading
                                        ?
                                        <>
                                            {Array.from({ length: 24 }).map((_, index) => (
                                                <Skeleton key={index} className="rounded-lg">
                                                    <div  className="h-24 w-24 rounded-lg bg-default-300"></div>
                                                </Skeleton>
                                            ))}
                                        </>
                                        : imgSrcs.length === 0
                                            ? <p>No images</p>
                                            :
                                            <>
                                                {imgSrcs.map((img, index) => (
                                                    <Image key={index} src={img.content} alt={img.name} width={400} height={400} onClick={() => { setSelectedImg(selectedcell?.value[index]); setSelectedImgIdx(index); onImgOpen(); }} />
                                                ))}
                                            </>
                                    }
                                </div>
                                {imgSrcs.length > 0 && (
                                    <Pagination
                                        total={Math.ceil(selectedcell?.value.length / itemsPerPage)}
                                        initialPage={currentPage}
                                        onChange={(page) => handlePageChange(page)}
                                    />
                                )}
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <Modal isOpen={isImgOpen} onOpenChange={onImgOpenChange} size="5xl">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">{selectedImg ? selectedImg.img : "Image"}</ModalHeader>
                            <ModalBody>
                                <>
                                    {selectedImg && (
                                        <div className="inline-block relative cursor-pointer">
                                            <Image src={imgSrcs[selectedImgIdx].content} alt={selectedImg.img} width={640} height={640} />
                                        </div>
                                    )}
                                </>
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}
export default ChartConfusionMatrix;
