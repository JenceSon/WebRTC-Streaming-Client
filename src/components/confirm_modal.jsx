import { CloseOutlined, DeleteOutlined, PhoneOutlined } from '@ant-design/icons';
import { Modal } from 'antd';

export default function ConfirmModal({ title, onCancel, onOk, okButtonProps = { icon: <PhoneOutlined />, }, cancelButtonProps = { icon: <CloseOutlined />, color: 'danger', variant: 'solid' }, okType = 'primary', okText = 'Accept', cancelText = 'Reject', ...props }) {
    return Modal.confirm({
        title: title,
        onOk: onOk,
        okType: okType,
        okButtonProps: okButtonProps,
        cancelButtonProps: cancelButtonProps,
        okText: okText,
        cancelText: cancelText,
        onCancel,
        ...props
    });
}