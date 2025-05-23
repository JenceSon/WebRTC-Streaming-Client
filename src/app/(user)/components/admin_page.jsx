import { useAppSelector } from '@/hooks/redux_hooks';
import { HomeFilled } from '@ant-design/icons';
import { Breadcrumb, Layout, Space } from 'antd';

const { Header, Content } = Layout;

const AdminPage = ({ title, children, breadcrumbItems, icon }) => {
    const user = useAppSelector('systemState', 'userReducer').user;
    return (
        <Layout className="!min-h-screen">
            <Header className="!bg-white !px-5 !py-2 !flex !justify-between !items-center !sticky !top-0 z-50 mb-4 shadow-sm">
                <div className="text-2xl font-bold text-primary flex items-center gap-2">
                    <Space>
                        {icon}
                        {title}
                    </Space>
                </div>
                <Breadcrumb
                    items={[
                        {
                            href: user?.isAdmin ? '/user' : '/student',
                            title: <HomeFilled />
                        },
                        ...breadcrumbItems
                    ]}
                />
            </Header>
            <Content>
                <div className='p-6 bg-white !min-h-[360px] !overflow-y-auto'>
                    {children}
                </div>
            </Content>
        </Layout>
    );
};

export default AdminPage;
