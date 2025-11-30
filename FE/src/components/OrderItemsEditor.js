import React, { useState, useEffect } from 'react';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TextField,
  Stack,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { ToastNotification, PrimaryButton, SecondaryButton, DangerButton, ActionButton, Icon } from './common';
import { Alert } from '@mui/material';

/**
 * OrderItemsEditor Component
 * Allows inline editing of order items with add/remove functionality
 */
export default function OrderItemsEditor({ 
  orderItems = [], 
  isEditable = false, 
  onSave,
  onAddProduct 
}) {
  const [editMode, setEditMode] = useState(false);
  const [items, setItems] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  // Initialize items from props
  useEffect(() => {
    setItems(orderItems.map(item => ({
      ...item,
      editedQuantity: item.quantity,
      hasChanges: false
    })));
  }, [orderItems]);

  // Calculate totals
  const calculateTotals = (itemsList) => {
    const totalAmount = itemsList.reduce((sum, item) => {
      const qty = editMode ? item.editedQuantity : item.quantity;
      const price = parseFloat(item.unit_price || 0);
      return sum + (qty * price);
    }, 0);
    
    const totalItems = itemsList.reduce((sum, item) => {
      const qty = editMode ? item.editedQuantity : item.quantity;
      return sum + qty;
    }, 0);

    return { totalAmount, totalItems };
  };

  const { totalAmount, totalItems } = calculateTotals(items);

  // Handle quantity change
  const handleQuantityChange = (index, newQuantity) => {
    const qty = parseInt(newQuantity) || 0;
    if (qty < 0) {
      ToastNotification.error('Số lượng phải là số dương');
      return;
    }

    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = {
        ...newItems[index],
        editedQuantity: qty,
        hasChanges: qty !== newItems[index].quantity
      };
      return newItems;
    });
  };

  // Handle delete item
  const confirmDelete = (item, index) => {
    setItemToDelete({ item, index });
    setDeleteDialog(true);
  };

  const handleDelete = () => {
    if (itemToDelete !== null) {
      setItems(prevItems => prevItems.filter((_, idx) => idx !== itemToDelete.index));
      setDeleteDialog(false);
      setItemToDelete(null);
      ToastNotification.success('Đã xóa sản phẩm');
    }
  };

  // Enter edit mode
  const handleEdit = () => {
    if (!isEditable) {
      ToastNotification.warning('Không thể chỉnh sửa đơn hàng đã khóa');
      return;
    }
    setEditMode(true);
  };

  // Cancel editing
  const handleCancel = () => {
    // Reset to original values
    setItems(orderItems.map(item => ({
      ...item,
      editedQuantity: item.quantity,
      hasChanges: false
    })));
    setEditMode(false);
  };

  // Save changes
  const handleSave = async () => {
    // Validate
    const hasInvalidQuantity = items.some(item => 
      item.editedQuantity === undefined || 
      item.editedQuantity === null || 
      item.editedQuantity <= 0
    );

    if (hasInvalidQuantity) {
      ToastNotification.error('Tất cả sản phẩm phải có số lượng lớn hơn 0');
      return;
    }

    if (items.length === 0) {
      ToastNotification.error('Đơn hàng phải có ít nhất 1 sản phẩm');
      return;
    }

    // Prepare data for API
    const updatedItems = items.map(item => ({
      product_id: item.product_id,
      quantity: item.editedQuantity,
      unit_price: parseFloat(item.unit_price),
      unit_id: item.unit_id
    }));

    setSaving(true);
    try {
      await onSave(updatedItems);
      setEditMode(false);
      ToastNotification.success('Cập nhật đơn hàng thành công');
    } catch (error) {
      ToastNotification.error(error.message || 'Không thể cập nhật đơn hàng');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = items.some(item => item.hasChanges) || items.length !== orderItems.length;

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Danh sách sản phẩm</Typography>
        <Stack direction="row" spacing={1}>
          {!editMode ? (
            <>
              {isEditable && (
                <>
                  <SecondaryButton
                    startIcon={<Icon name="Add" />}
                    onClick={onAddProduct}
                    size="small"
                  >
                    Thêm sản phẩm
                  </SecondaryButton>
                  <PrimaryButton
                    startIcon={<Icon name="Edit" />}
                    onClick={handleEdit}
                    size="small"
                  >
                    Chỉnh sửa
                  </PrimaryButton>
                </>
              )}
              {!isEditable && (
                <Tooltip title="Đơn hàng đã khóa, không thể chỉnh sửa">
                  <SecondaryButton
                    startIcon={<Icon name="Lock" />}
                    disabled
                    size="small"
                  >
                    Đã khóa
                  </SecondaryButton>
                </Tooltip>
              )}
            </>
          ) : (
            <>
              <SecondaryButton
                startIcon={<Icon name="Cancel" />}
                onClick={handleCancel}
                disabled={saving}
                size="small"
              >
                Hủy
              </SecondaryButton>
              <PrimaryButton
                startIcon={<Icon name="Save" />}
                onClick={handleSave}
                disabled={saving || !hasChanges}
                loading={saving}
                size="small"
              >
                Lưu thay đổi
              </PrimaryButton>
            </>
          )}
        </Stack>
      </Stack>

      {editMode && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Đang ở chế độ chỉnh sửa. Thay đổi số lượng hoặc xóa sản phẩm, sau đó nhấn "Lưu thay đổi".
        </Alert>
      )}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sản phẩm</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell align="right">Số lượng</TableCell>
              <TableCell>Đơn vị</TableCell>
              <TableCell align="right">Đơn giá</TableCell>
              <TableCell align="right">Thành tiền</TableCell>
              {editMode && <TableCell align="center">Hành động</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={editMode ? 7 : 6} align="center">
                  <Alert severity="warning">Chưa có sản phẩm nào trong đơn hàng</Alert>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, idx) => {
                const qty = editMode ? item.editedQuantity : item.quantity;
                const subtotal = qty * parseFloat(item.unit_price || 0);

                return (
                  <TableRow 
                    key={idx}
                    sx={{ 
                      backgroundColor: item.hasChanges ? 'action.hover' : 'inherit' 
                    }}
                  >
                    <TableCell>{item.product?.name || '—'}</TableCell>
                    <TableCell>{item.product?.sku || '—'}</TableCell>
                    <TableCell align="right">
                      {editMode ? (
                        <TextField
                          type="number"
                          value={item.editedQuantity}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          size="small"
                          inputProps={{ min: 1, style: { textAlign: 'right' } }}
                          sx={{ width: 100 }}
                          error={item.editedQuantity <= 0}
                        />
                      ) : (
                        qty
                      )}
                    </TableCell>
                    <TableCell>{item.unit?.name || '—'}</TableCell>
                    <TableCell align="right">
                      {Number(item.unit_price || 0).toLocaleString('vi-VN')} đ
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        fontWeight={item.hasChanges ? 700 : 400}
                        color={item.hasChanges ? 'primary' : 'inherit'}
                      >
                        {subtotal.toLocaleString('vi-VN')} đ
                      </Typography>
                    </TableCell>
                    {editMode && (
                      <TableCell align="center">
                        <Tooltip title="Xóa sản phẩm">
                          <ActionButton
                            icon={<Icon name="Delete" />}
                            action="delete"
                            size="small"
                            onClick={() => confirmDelete(item, idx)}
                            disabled={items.length === 1}
                            tooltip="Xóa sản phẩm"
                          />
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
            <TableRow>
              <TableCell colSpan={editMode ? 6 : 5} align="right">
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Typography variant="body2" color="text.secondary">
                    Tổng số lượng: <b>{totalItems}</b>
                  </Typography>
                  <Typography variant="body1">
                    <b>Tổng cộng:</b>
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" fontWeight={700}>
                  {totalAmount.toLocaleString('vi-VN')} đ
                </Typography>
              </TableCell>
              {editMode && <TableCell />}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Xác nhận xóa sản phẩm</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa sản phẩm <b>{itemToDelete?.item?.product?.name}</b> khỏi đơn hàng?
          </Typography>
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={() => setDeleteDialog(false)}>Hủy</SecondaryButton>
          <DangerButton onClick={handleDelete}>
            Xóa
          </DangerButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

