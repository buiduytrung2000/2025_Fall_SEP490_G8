    -- =====================================================
    -- CCMS Database - Sample Data
    -- =====================================================
    -- This file contains sample INSERT statements for testing
    -- =====================================================

    USE CCMS_DB;

    -- =====================================================
    -- INSERT SAMPLE DATA
    -- =====================================================

    -- 1. Insert Stores
    INSERT INTO Store (name, address, phone, status) VALUES
    ('Store Central', '123 Main Street, City A', '0123456789', 'active'),
    ('Store North', '456 North Avenue, City B', '0987654321', 'active'),
    ('Store South', '789 South Road, City C', '0123987654', 'active');

    -- 2. Insert Categories (with hierarchy) - mô phỏng siêu thị tổng hợp
    INSERT INTO Category (name, parent_id) VALUES
    ('Thực phẩm khô', NULL),          -- 1
    ('Hàng tiêu dùng', NULL),         -- 2
    ('Đồ uống', NULL),                -- 3
    ('Gạo & Ngũ cốc', 1),             -- 4
    ('Gia vị & Nước chấm', 1),        -- 5
    ('Chăm sóc cá nhân', 2),          -- 6
    ('Vệ sinh nhà cửa', 2);           -- 7

    -- 3. Insert Suppliers - nhà cung cấp cho siêu thị
    INSERT INTO Supplier (name, contact, email, address) VALUES
    ('Nhà Phân Phối Thực Phẩm A', 'Nguyễn Văn A', 'salesA@fooddist.com', '100 Đường Kho Thực Phẩm'),
    ('Công Ty Hàng Tiêu Dùng B', 'Trần Thị B', 'salesB@fmcg.com', '200 Khu Công Nghiệp B'),
    ('Công Ty Đồ Uống C', 'Lê Văn C', 'salesC@beverage.com', '300 KCN Nước Giải Khát');

    -- Note: includes phone column
    -- Passwords are hashed using bcrypt (password: '123')
    INSERT INTO User (username, password, role, store_id, email, phone, address, status) VALUES
    ('ceo_admin', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'CEO', NULL, 'ceo@ccms.com', '0900000001', '123 CEO Street, City A', 'active'),
    ('manager_store1', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Store_Manager', 1, 'manager1@ccms.com', '0900000002', '88 Manager Blvd, City A', 'active'),
    ('cashier_store1_1', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Cashier', 1, 'cashier1@ccms.com', '0900000003', '15 Cashier Lane, City A', 'active'),
    ('cashier_store1_2', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Cashier', 1, 'cashier2@ccms.com', '0900000004', '47 Cashier Lane, City A', 'active'),
    ('cashier_store1_3', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Cashier', 1, 'cashier3@ccms.com', '0900000005', '102 Retail Road, City A', 'active'),
    ('warehouse_staff1', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Warehouse', NULL, 'warehouse1@ccms.com', '0900000006', '55 Logistics Park, City B', 'active'),
    ('supplier_rep1', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Supplier', NULL, 'supplier1@ccms.com', '0900000007', '999 Supplier Road, City C', 'active');

    -- 5. Insert Products - danh mục sản phẩm siêu thị (không có điện tử)
    INSERT INTO Product (name, sku, category_id, supplier_id, hq_price, description) VALUES
    ('Gạo thơm Jasmine 5kg', 'GAO5KG001', 4, 1, 120000, 'Bao gạo thơm Jasmine 5kg, hạt dài, mềm cơm'),
    ('Dầu ăn hướng dương 1L', 'DAU1L001', 5, 1, 55000, 'Chai dầu ăn hướng dương 1 lít, dùng chiên xào'),
    ('Nước mắm truyền thống 750ml', 'NUOCMAM750001', 5, 1, 45000, 'Chai nước mắm cá cơm độ đạm cao, 750ml'),
    ('Mì gói thùng 30 gói', 'MITHUNG30001', 4, 1, 90000, 'Thùng mì gói 30 gói, nhiều hương vị'),
    ('Đường trắng tinh luyện 1kg', 'DUONG1KG001', 1, 1, 28000, 'Túi đường trắng tinh luyện 1kg'),
    ('Nước khoáng 500ml (thùng 24 chai)', 'NUOCKHOANG500001', 3, 3, 85000, 'Thùng 24 chai nước khoáng 500ml, có gas nhẹ');

    -- 6. Insert Inventory
    INSERT INTO Inventory (store_id, product_id, stock, min_stock_level, reorder_point) VALUES
    (1, 1, 50, 10, 20),
    (1, 2, 30, 5, 15),
    (1, 3, 15, 3, 10),
    (1, 4, 100, 20, 50),
    (1, 5, 80, 15, 40),
    (1, 6, 200, 50, 100),
    (2, 1, 40, 10, 20),
    (2, 2, 25, 5, 15),
    (2, 4, 80, 20, 50),
    (3, 6, 150, 50, 100);

    -- 6b. Insert Warehouse Inventory
    --   Sử dụng các product_id đã có trong bảng Product (1–6)
    --   Mỗi sản phẩm chỉ xuất hiện 1 lần do constraint UNIQUE (product_id)
    INSERT INTO WarehouseInventory (product_id, stock, min_stock_level, reorder_point, location, notes) VALUES
    (1, 500, 50, 200, 'Kho chính - Kệ Gạo A1', 'Gạo Jasmine 5kg, mặt hàng bán chạy'),
    (2, 400, 40, 160, 'Kho chính - Kệ Gia vị B1', 'Dầu ăn hướng dương 1L'),
    (3, 300, 30, 120, 'Kho chính - Kệ Gia vị B2', 'Nước mắm truyền thống 750ml'),
    (4, 800, 100, 300, 'Kho đồ khô - Kệ Mì C1', 'Mì gói thùng 30 gói'),
    (5, 600, 80, 250, 'Kho đồ khô - Kệ Đường C2', 'Đường trắng tinh luyện 1kg'),
    (6, 1000, 150, 400, 'Kho nước uống - Kệ D1', 'Thùng nước khoáng 500ml (24 chai)');

    -- 7. Insert Pricing Rules
    INSERT INTO PricingRule (product_id, store_id, type, value, start_date, end_date) VALUES
    (1, 1, 'markup', 10.00, '2024-01-01 00:00:00', '2024-12-31 23:59:59'),
    (2, 1, 'markup', 15.00, '2024-01-01 00:00:00', '2024-12-31 23:59:59'),
    (4, 1, 'fixed_price', 15.99, '2024-05-01 00:00:00', '2024-12-31 23:59:59'),
    (6, 1, 'markdown', 5.00, '2024-06-01 00:00:00', '2024-08-31 23:59:59');

    -- 9. Insert Customers
    INSERT INTO Customer (name, phone, email, loyalty_point, tier) VALUES
    ('John Customer', '0901234567', 'john.customer@email.com', 500, 'gold'),
    ('Mary Shopper', '0902345678', 'mary.shopper@email.com', 150, 'silver'),
    ('Bob Buyer', '0903456789', 'bob.buyer@email.com', 50, 'bronze');

    -- 8. Insert Orders (Purchase Orders from Suppliers)
    INSERT INTO `Order` (store_id, supplier_id, created_by, status, expected_delivery) VALUES
    (1, 1, 2, 'confirmed', '2024-12-20 10:00:00'),
    (1, 2, 2, 'pending', '2024-12-25 14:00:00'),
    (1, 3, 2, 'delivered', '2024-12-15 09:00:00');

    -- 9. Insert Order Items
    INSERT INTO OrderItem (order_id, product_id, quantity, unit_price, subtotal) VALUES
    (1, 1, 10, 999.99, 9999.90),
    (1, 2, 5, 899.99, 4499.95),
    (2, 4, 50, 19.99, 999.50),
    (2, 5, 30, 49.99, 1499.70),
    (3, 6, 100, 12.99, 1299.00);

    -- 10. Insert Payments
    INSERT INTO Payment (method, amount, status, paid_at) VALUES
    ('card', 1099.98, 'completed', '2024-12-10 15:30:00'),
    ('cash', 599.97, 'completed', '2024-12-11 10:15:00'),
    ('mobile_payment', 2499.99, 'completed', '2024-12-12 14:45:00'),
    ('card', 129.90, 'completed', '2024-12-13 16:20:00');

    -- 11. Insert Transactions (Sales)
    INSERT INTO Transaction (order_id, customer_id, payment_id, store_id, total_amount, status) VALUES
    (NULL, 1, 1, 1, 1099.98, 'completed'),
    (NULL, 2, 2, 1, 599.97, 'completed'),
    (NULL, 1, 3, 1, 2499.99, 'completed'),
    (NULL, 3, 4, 1, 129.90, 'completed');

    -- 12. Insert Transaction Items
    INSERT INTO TransactionItem (transaction_id, product_id, quantity, unit_price, subtotal) VALUES
    (1, 1, 1, 1099.98, 1099.98),
    (2, 2, 1, 599.97, 599.97),
    (3, 3, 1, 2499.99, 2499.99),
    (4, 4, 5, 25.98, 129.90),
    (4, 5, 1, 49.99, 49.99);

    -- =====================================================
    -- SCHEDULE MANAGEMENT DATA
    -- =====================================================

    -- 13. Insert Shift Templates (Ca làm việc)
    INSERT INTO ShiftTemplate (name, start_time, end_time, description, is_active) VALUES
    ('Ca Sáng', '06:00:00', '14:00:00', 'Ca làm việc buổi sáng từ 6h đến 14h', TRUE),
    ('Ca Tối', '14:00:00', '22:00:00', 'Ca làm việc buổi tối từ 14h đến 22h', TRUE),
    ('Ca Đêm', '22:00:00', '06:00:00', 'Ca làm việc đêm từ 22h đến 6h sáng hôm sau', TRUE);

    -- 14. Insert Schedules (Phân công lịch làm việc)
    -- Lịch làm việc tuần từ 2024-12-16 đến 2024-12-22 (Tuần 51)
    INSERT INTO Schedule (store_id, user_id, shift_template_id, work_date, status, notes, created_by) VALUES
    -- Thứ Hai (2024-12-16)
    (1, 3, 1, '2024-12-16', 'confirmed', 'Ca sáng thứ hai', 2),
    (1, 4, 2, '2024-12-16', 'confirmed', 'Ca tối thứ hai', 2),
    -- Thứ Ba (2024-12-17)
    (1, 3, 1, '2024-12-17', 'confirmed', 'Ca sáng thứ ba', 2),
    (1, 5, 2, '2024-12-17', 'confirmed', 'Ca tối thứ ba', 2),
    -- Thứ Tư (2024-12-18)
    (1, 4, 1, '2024-12-18', 'confirmed', 'Ca sáng thứ tư', 2),
    (1, 3, 2, '2024-12-18', 'confirmed', 'Ca tối thứ tư', 2),
    -- Thứ Năm (2024-12-19)
    (1, 5, 1, '2024-12-19', 'confirmed', 'Ca sáng thứ năm', 2),
    (1, 4, 2, '2024-12-19', 'confirmed', 'Ca tối thứ năm', 2),
    -- Thứ Sáu (2024-12-20)
    (1, 3, 1, '2024-12-20', 'confirmed', 'Ca sáng thứ sáu', 2),
    (1, 5, 2, '2024-12-20', 'confirmed', 'Ca tối thứ sáu', 2),
    -- Thứ Bảy (2024-12-21)
    (1, 4, 1, '2024-12-21', 'confirmed', 'Ca sáng thứ bảy', 2),
    (1, 3, 2, '2024-12-21', 'confirmed', 'Ca tối thứ bảy', 2),
    -- Chủ Nhật (2024-12-22)
    (1, 5, 1, '2024-12-22', 'confirmed', 'Ca sáng chủ nhật', 2),
    (1, 4, 2, '2024-12-22', 'draft', 'Ca tối chủ nhật - chưa xác nhận', 2);

    -- 15. Insert Shift Change Requests (Yêu cầu đổi ca)
    INSERT INTO ShiftChangeRequest (store_id, from_schedule_id, from_user_id, to_user_id, to_schedule_id, to_work_date, to_shift_template_id, request_type, reason, status, reviewed_by, reviewed_at) VALUES
    -- Yêu cầu đổi ca đã được duyệt (swap với schedule có sẵn)
    (1, 5, 4, 3, 6, NULL, NULL, 'swap', 'Có việc đột xuất vào buổi sáng thứ tư', 'approved', 2, '2024-12-15 10:30:00'),
    -- Yêu cầu đổi ca đang chờ duyệt (give away - để quản lý tự phân công)
    (1, 14, 4, NULL, NULL, NULL, NULL, 'give_away', 'Không thể làm ca tối chủ nhật', 'pending', NULL, NULL),
    -- Yêu cầu đổi ca bị từ chối (swap với schedule có sẵn)
    (1, 12, 5, 3, 8, NULL, NULL, 'swap', 'Muốn đổi ca để đi chơi', 'rejected', 2, '2024-12-15 14:20:00'),
    -- Yêu cầu đổi ca với ca trống (swap với ca trống - ví dụ)
    (1, 3, 3, NULL, NULL, '2024-12-25', 2, 'swap', 'Muốn đổi sang ca tối ngày 25/12', 'pending', NULL, NULL);



-- Thêm các mẫu voucher theo mức điểm
INSERT INTO VoucherTemplate (voucher_code_prefix, voucher_name, discount_type, discount_value, min_purchase_amount, max_discount_amount, required_loyalty_points, validity_days, is_active) VALUES
-- Mức 0 điểm (Khách hàng mới)
('WELCOME10', 'Giảm 10% cho đơn hàng đầu tiên', 'percentage', 10.00, 100000, 50000, 0, 30, TRUE),
('FREESHIP', 'Miễn phí vận chuyển', 'fixed_amount', 30000.00, 0, NULL, 0, 15, TRUE),

-- Mức 100 điểm
('SAVE20K', 'Giảm 20.000đ cho đơn từ 200.000đ', 'fixed_amount', 20000.00, 200000, NULL, 100, 30, TRUE),
('DISCOUNT5', 'Giảm 5% cho mọi đơn hàng', 'percentage', 5.00, 0, 30000, 100, 30, TRUE),

-- Mức 200 điểm
('SAVE50K', 'Giảm 50.000đ cho đơn từ 500.000đ', 'fixed_amount', 50000.00, 500000, NULL, 200, 30, TRUE),
('DISCOUNT10', 'Giảm 10% cho đơn từ 300.000đ', 'percentage', 10.00, 300000, 80000, 200, 30, TRUE),
('COMBO15', 'Giảm 15% cho đơn từ 400.000đ', 'percentage', 15.00, 400000, 100000, 200, 45, TRUE),

-- Mức 500 điểm
('SAVE100K', 'Giảm 100.000đ cho đơn từ 1.000.000đ', 'fixed_amount', 100000.00, 1000000, NULL, 500, 30, TRUE),
('VIP20', 'Giảm 20% cho khách hàng VIP', 'percentage', 20.00, 500000, 150000, 500, 60, TRUE),
('MEGA25', 'Giảm 25% cho đơn từ 800.000đ', 'percentage', 25.00, 800000, 200000, 500, 60, TRUE),

-- Mức 1000 điểm (Platinum)
('SAVE200K', 'Giảm 200.000đ cho đơn từ 2.000.000đ', 'fixed_amount', 200000.00, 2000000, NULL, 1000, 60, TRUE),
('PLATINUM30', 'Giảm 30% cho khách hàng Platinum', 'percentage', 30.00, 1000000, 300000, 1000, 90, TRUE),
('ULTRA35', 'Giảm 35% cho đơn từ 1.500.000đ', 'percentage', 35.00, 1500000, 500000, 1000, 90, TRUE);
