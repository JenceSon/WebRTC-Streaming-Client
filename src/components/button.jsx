import { Button, Tooltip } from 'antd';
import { FilterFilled, FilterOutlined } from '@ant-design/icons';

export function TooltipButton({ title, color = 'primary', variant = 'solid', icon, onClick, type, ...props }) {
    return (
        <Tooltip placement="top" title={title}>
            <Button
                type={type}
                color={color}
                variant={variant}
                icon={icon}
                onClick={onClick}
                {...props}
            />
        </Tooltip>
    );
}