// src/pages/Admin/AdminPermissions.js
import React, { useState, useEffect, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import { getUsers } from '../../api/mockApi';
import { MaterialReactTable } from 'material-react-table';
import { Box, IconButton } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';

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
                        <IconButton
                            color="warning"
                            onClick={() => {
                                console.log('Edit user:', row.original);
                            }}
                        >
                            <Edit />
                        </IconButton>
                        <IconButton
                            color="error"
                            onClick={() => {
                                console.log('Delete user:', row.original);
                            }}
                        >
                            <Delete />
                        </IconButton>
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