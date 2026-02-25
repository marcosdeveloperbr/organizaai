// @ts-ignore
import withPWA from "next-pwa";

const nextConfig = {
  reactStrictMode: true,
};

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

export default pwaConfig(nextConfig);