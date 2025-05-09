import { Flex, Typography } from 'antd';
import './logo.style.css';
import Image from 'next/image';
import Link from 'next/link';

export const Logo = ({
    asLink,
    title,
    logoPublicPath,
    color,
    href,
    imgSize,
    bgColor,
    ...others
}) => {

    return asLink ? (
        <Link href={href || '#'} className='logo-link'>
            <Flex gap={others.gap || 'small'} align='center' {...others}>
                {/* <Image
                    src={logoPublicPath}
                    alt='design sparx logo'
                    width={imgSize?.w || 48}
                    height={imgSize?.h || 48}
                /> */}
                <Typography.Title
                    level={5}
                    type='secondary'
                    style={{
                        color,
                        margin: 0,
                        padding: '4px 8px',
                        backgroundColor: bgColor,
                    }}
                >
                    {title}
                </Typography.Title>
            </Flex>
        </Link>
    ) : (
        <Flex gap={others.gap || 'small'} align='center' {...others}>
            {/* <Image
                src={logoPublicPath}
                alt='design sparx logo'
                width={imgSize?.w || 48}
                height={imgSize?.h || 48}
            /> */}
            <Typography.Title
                level={4}
                type='secondary'
                style={{
                    color,
                    margin: 0,
                    padding: '4px 8px',
                    backgroundColor: bgColor,
                }}
            >
                {title}
            </Typography.Title>
        </Flex>
    );
};