'use client';
import { useAppRouter } from '@/hooks/router_hook';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Col, Form, Input, InputNumber, Modal, Radio, Row } from 'antd';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { createHostTokenSmManageRoomsV2, createRoomSmManageRooms, updateRoomSmManageRoomsV2 } from '../redux';

const EditConfigRoomModal = forwardRef(({ getLivekitRoomsList }, ref) => {
    const [state, setState] = useState({
        isOpen: false,
        item: undefined
    });
    useImperativeHandle(ref, () => ({
        show: (item) => {
            if (item) {
                form.setFieldsValue(item);
                setState({ ...state, isOpen: true, item });
                return;
            }
            setState({ ...state, isOpen: true, item: undefined });
            form.resetFields();
        }
    }));
    const [form] = Form.useForm();
    const router = useAppRouter();
    const handleSubmit = async values => {
        const { mediaServer, maxParticipants, emptyTimeout } = values;
        if (!state.item) {
            if (mediaServer == 'kurento') {
                const roomId = await createRoomSmManageRooms();
                if (roomId) router.push(`stream-room/mesh/${roomId.trim()}`);
            }
            if (mediaServer == 'livekit') {
                const result = await createHostTokenSmManageRoomsV2({ emptyTimeout: emptyTimeout, maxParticipants });
                if (result) {
                    const { roomId, token } = result;
                    router.push(`stream-room/sfu/${roomId.trim()}`);
                }
            }
            return;
        }
        const result = await updateRoomSmManageRoomsV2({ id: state.item.id, maxParticipants, emptyTimeout });
        if (result) {
            await getLivekitRoomsList();
            setState({ ...state, isOpen: false });
        }
    };

    return (
        <Modal
            title='Set up configuration of room'
            okText='Confirm'
            okButtonProps={{
                icon: <CheckOutlined />,
                type: 'primary',
                variant: 'solid',
            }}
            cancelText='Cancel'
            cancelButtonProps={{
                icon: <CloseOutlined />
            }}
            open={state.isOpen}
            onCancel={() => setState({ ...state, isOpen: false, item: undefined })}
            onOk={form.submit}
            width={480}
        >
            <Form
                form={form}
                onFinish={handleSubmit}
                initialValues={{ mediaServer: 'livekit' }}
            >
                <Row gutter={[16, 16]}>
                    <Col span={24}>
                        <Form.Item label='Media Server' name='mediaServer' required>
                            <Radio.Group
                                options={[
                                    { value: 'kurento', label: 'Kurento' },
                                    { value: 'livekit', label: 'Livekit' }
                                ]}
                            />
                        </Form.Item>
                    </Col>
                    <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => getFieldValue('mediaServer') == 'livekit' && (<>
                            <Col span={12}>
                                <Form.Item label='Max participants' name='maxParticipants' required rules={[{ type: 'integer' }]}>
                                    <InputNumber min={1} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label='Empty timeout' name='emptyTimeout' required rules={[{ type: 'integer' }]}>
                                    <InputNumber min={1} suffix='s' />
                                </Form.Item>
                            </Col>
                        </>)}
                    </Form.Item>
                </Row>
            </Form>
        </Modal>
    );
});

export default EditConfigRoomModal;