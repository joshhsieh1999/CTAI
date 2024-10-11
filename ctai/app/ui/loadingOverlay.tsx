import { Spinner } from "@nextui-org/react";
; // 假设这是你的加载中图标组件

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <Spinner aria-label="Loading..." />
  </div>
);

export default LoadingOverlay;
