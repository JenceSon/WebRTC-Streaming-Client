import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
    webpack: (config) => {
        config.resolve.alias['@redux-store'] = path.join(__dirname, 'src/redux');
        config.module.rules.push({
            test: /redux\/index\.jsx$/,
            use: [
                {
                    loader: path.resolve(__dirname, 'loaders/redux-store-loader.js'),
                },
            ],
        });

        return config;
    },
    reactStrictMode: false
};



export default nextConfig;
