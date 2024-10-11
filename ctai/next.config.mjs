/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
};

import withLlamaIndex from "llamaindex/next";
export default withLlamaIndex(nextConfig);
// export default nextConfig;
