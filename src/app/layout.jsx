'use client';
import './index.css';

import ReduxProvider from '@/redux/provider';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import Metadata from '@/components/meta_data';
import { App } from 'antd';


export default function RootLayout({ children }) {
    return (
        <html lang='en'>
            <Metadata seoTitle={'WebRTC'} seoDescription={'WebRTC'} />
            <body style={{ backgroundColor: 'white' }}>
                <ReduxProvider>
                    <AntdRegistry>
                        <App>
                            {children}
                        </App>
                    </AntdRegistry>
                </ReduxProvider>
            </body >
        </html >
    );
}

