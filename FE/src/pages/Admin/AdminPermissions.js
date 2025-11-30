// src/pages/Admin/AdminPermissions.js
import React, { useState, useEffect, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import { getUsers } from '../../api/mockApi';
import { MaterialReactTable } from 'material-react-table';
import { Box } from '@mui/material';
import { ActionButton, Icon } from '../../components/common';

const AdminPermissions = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUsers().then(data => {
            setUsers(data);
            setLoading(false);
        });
    }, []);

    // Định nghĩa các cột cho bảng
    const columns = useMemo(
        () => [
            {
                accessorKey: 'id',
                header: 'ID',
                size: 50,
            },
            {
                accessorKey: 'name',
                header: 'Tên người dùng',
            },
            {
                accessorKey: 'role',
                header: 'Vai trò',
            },
        ],
        [],
    );

    if (loading) return <Spinner animation="border" />;

    return (
        <div>
            <h2>Quản lý Phân quyền Người dùng</h2>
            <MaterialReactTable
                columns={columns}
                data={users}
                enableRowActions
                positionActionsColumn="last"
                renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: '1rem' }}>
                        <ActionButton
                            icon={<Icon name="Edit" />}
                            action="edit"
                            onClick={() => {
                                console.log('Edit user:', row.original);
                            }}
                        />
                        <ActionButton
                            icon={<Icon name="Delete" />}
                            action="delete"
                            onClick={() => {
                                console.log('Delete user:', row.original);
                            }}
                        />
                    </Box>
                )}
                // Thêm các thuộc tính internationalization (tiếng Việt) nếu muốn
                localization={{
                    actions: 'Hành động',
                    search: 'Tìm kiếm',
                    //...
                }}
            />
        </div>
    );
};

export default AdminPermissions;