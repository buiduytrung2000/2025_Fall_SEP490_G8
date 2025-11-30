
    USE CCMS_DB;
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
    ('Rau củ quả', NULL);           -- 7

    -- 3. Insert Suppliers - nhà cung cấp cho siêu thị
INSERT INTO Supplier (user_id, name, contact, email, address) VALUES
(7, 'Nhà Phân Phối Thực Phẩm A', 'Nguyễn Văn A', 'salesA@fooddist.com', '100 Đường Kho Thực Phẩm'),
(8, 'Công Ty Hàng Tiêu Dùng B', 'Trần Thị B', 'salesB@fmcg.com', '200 Khu Công Nghiệp B'),
(9, 'Công Ty Đồ Uống C', 'Lê Văn C', 'salesC@beverage.com', '300 KCN Nước Giải Khát'),
(10, 'Công Ty Rau Củ Quả D', 'Lê Văn D', 'salesD@beverage.com', '300 KCN Nước Giải Khát');

-- 4. Insert Units & Product Units for multi-level conversion
INSERT INTO Unit (name, symbol, level) VALUES
('Kilogram', 'kg', 3),          -- 1
('Liter', 'L', 3),              -- 2
('Milliliter', 'ml', 4),        -- 3
('Chai', 'chai', 3),            -- 4
('Gói', 'goi', 3),              -- 5
('Thùng', 'thung', 1),          -- 6
('Bịch', 'bich', 1),          -- 7
('Bao', 'bao', 2);              -- 8

    -- Note: includes phone column, full_name, is_active
    -- Passwords are hashed using bcrypt (password: '123')
    INSERT INTO User (user_id, username, password, role, store_id, email, phone, address, full_name, is_active, status, created_at, updated_at) VALUES
    (1, 'ceo_admin', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'CEO', NULL, 'ceo@ccms.com', '0900000001', '123 CEO Street, City A', NULL, 1, 'active', '2025-11-20 21:43:33', '2025-11-28 12:54:58'),
    (2, 'manager_store1', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Store_Manager', 1, 'manager1@ccms.com', '0900000002', '88 Manager Blvd, City A', 'manage', 1, 'active', '2025-11-20 21:43:33', '2025-11-28 19:21:40'),
    (3, 'cashier_store1_1', '$2a$10$hJ3aTfVD1/Is/FdLhmcxKOLAQwL1kcUH3yFt8vn7SRxIqpIC4t4.C', 'Cashier', 1, 'cashier1@ccms.com', '0900000004', '15 Cashier Lane, City A', 'cash 1', 1, 'active', '2025-11-20 21:43:33', '2025-11-28 19:49:23'),
    (4, 'cashier_store1_2', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Cashier', 1, 'cashier2@ccms.com', '0900000004', '47 Cashier Lane, City A', NULL, 1, 'active', '2025-11-20 21:43:33', '2025-11-20 21:43:33'),
    (5, 'cashier_store1_3', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Cashier', 1, 'cashier3@ccms.com', '0900000005', '102 Retail Road, City A', NULL, 1, 'active', '2025-11-20 21:43:33', '2025-11-20 21:43:33'),
    (6, 'warehouse_staff1', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Warehouse', NULL, 'warehouse1@ccms.com', '0900000006', '55 Logistics Park, City B', NULL, 1, 'active', '2025-11-20 21:43:33', '2025-11-20 21:43:33'),
    (7, 'supplier_rep1', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Supplier', NULL, 'supplier1@ccms.com', '0900000007', '999 Supplier Road, City C', NULL, 1, 'active', '2025-11-20 21:43:33', '2025-11-20 21:43:33'),
    (8, 'supplier_rep2', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Supplier', NULL, 'supplier2@ccms.com', '0900000007', '999 Supplier Road, City C', NULL, 1, 'active', '2025-11-20 21:43:33', '2025-11-20 21:43:33'),
    (9, 'manager_store2', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Store_Manager', 2, 'manager2@ccms.com', '0900000002', '88 Manager Blvd, City A', NULL, 1, 'active', '2025-11-20 21:43:33', '2025-11-25 21:04:51'),
    (10, 'supplier_rep3', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Supplier', NULL, 'supplier3@ccms.com', '0900000002', '88 Manager Blvd, City A', NULL, 1, 'active', '2025-11-20 21:43:33', '2025-11-25 21:04:51'),
    (11, 'admin', '$2a$12$LriR6uSae2RMldNOintk4u3ST7dkGniBMbtvnMTi0qwmtzvovmQgC', 'Admin', NULL, 'admin@ccms.com', '0900000002', '88 Manager Blvd, City A', NULL, 1, 'active', '2025-11-20 21:43:33', '2025-11-25 21:04:51');

    -- Reset AUTO_INCREMENT for User table
    ALTER TABLE User AUTO_INCREMENT = 12;

-- 5. Insert Products - danh mục sản phẩm siêu thị (không có điện tử)
INSERT INTO Product (name, sku, category_id, supplier_id, base_unit_id, hq_price, import_price, is_perishable, description, is_active) VALUES
('Gạo thơm Jasmine 5kg', 'GAO5KG001', 4, 1, 7, 120000.00, 1000000.00, 0, 'Bao gạo thơm Jasmine 5kg, hạt dài, mềm cơm', 1),
('Dầu ăn hướng dương 1L', 'DAU1L001', 5, 1, 4, 55000.00, 0.00, 0, 'Chai dầu ăn hướng dương 1 lít, dùng chiên xào', 1),
('Nước mắm truyền thống 750ml', 'NUOCMAM750001', 5, 1, 4, 45000.00, 0.00, 0, 'Chai nước mắm cá cơm độ đạm cao, 750ml', 1),
('Mì gói thùng 30 gói', 'MITHUNG30001', 4, 1, 5, 90000.00, 0.00, 0, 'Thùng mì gói 30 gói, nhiều hương vị', 1),
('Đường trắng tinh luyện 1kg', 'DUONG1KG001', 1, 1, 5, 28000.00, 0.00, 0, 'Túi đường trắng tinh luyện 1kg', 1),
('Nước khoáng 500ml (thùng 24 chai)', 'NUOCKHOANG500001', 3, 3, 4, 85000.00, 0.00, 0, 'Thùng 24 chai nước khoáng 500ml, có gas nhẹ', 1),
('Rau tươi ', 'RAU600001', 7, 4, 1, 6000.00, 5000.00, 1, 'Rau tươi ', 1);

-- 5b. Insert Product Units & conversion ratios
INSERT INTO ProductUnit (product_id, unit_id, conversion_to_base) VALUES
(1, 7, 5.000000),  
(2, 6, 8.000000),  
(3, 6, 10.000000),  
(4, 6, 30.000000), 
(5, 6, 30.000000), 
(6, 6, 24.000000); 

-- 6. Insert Inventory (base_quantity = đơn vị cơ sở, reserved_quantity = 0)
INSERT INTO Inventory (store_id, product_id, base_quantity, reserved_quantity, min_stock_level, reorder_point) VALUES
(1, 1, 243, 0, 50, 100),
(1, 2, 27, 0, 5, 15),
(1, 3, 11249, 0, 2250, 7500),
(1, 4, 2999, 0, 600, 1500),
(1, 5, 80, 0, 15, 40),
(1, 6, 4896, 0, 1200, 2400),
(2, 1, 200, 0, 50, 100),
(2, 2, 25, 0, 5, 15),
(2, 4, 2400, 0, 600, 1500),
(3, 6, 3600, 0, 1200, 2400),
(1, 7, 362, 0, 50, 100);

    -- 6b. Insert Warehouse Inventory
    --   Sử dụng các product_id đã có trong bảng Product (1–6)
    --   Mỗi sản phẩm chỉ xuất hiện 1 lần do constraint UNIQUE (product_id)
INSERT INTO WarehouseInventory (product_id, base_quantity, reserved_quantity, min_stock_level, reorder_point, location, notes) VALUES
(1, 2500, 0, 250, 1000, 'Kho chính - Kệ Gạo A1', 'Gạo Jasmine 5kg, mặt hàng bán chạy'),
(2, 400, 0, 40, 160, 'Kho chính - Kệ Gia vị B1', 'Dầu ăn hướng dương 1L'),
(3, 225000, 0, 22500, 90000, 'Kho chính - Kệ Gia vị B2', 'Nước mắm truyền thống 750ml'),
(4, 24000, 0, 3000, 9000, 'Kho đồ khô - Kệ Mì C1', 'Mì gói thùng 30 gói'),
(5, 600, 0, 80, 250, 'Kho đồ khô - Kệ Đường C2', 'Đường trắng tinh luyện 1kg'),
(6, 24000, 0, 3600, 9600, 'Kho nước uống - Kệ D1', 'Thùng nước khoáng 500ml (24 chai)');

    -- 7. Insert Orders
    INSERT INTO `Order` (order_id, order_code, supplier_id, created_by, created_at, status, expected_delivery, direct_to_store, target_store_id, updated_at) VALUES
    (46, 'XKJXOZ', 1, 6, '2025-11-29 16:52:41', 'confirmed', NULL, 0, NULL, '2025-11-29 16:59:42'),
    (47, 'OT3IZW', 1, 6, '2025-11-29 17:07:25', 'confirmed', NULL, 0, NULL, '2025-11-29 17:07:25'),
    (48, '8LSD5Y', 1, 6, '2025-11-29 17:07:54', 'confirmed', NULL, 0, NULL, '2025-11-29 17:07:54'),
    (49, 'GIC73P', 1, 6, '2025-11-29 18:11:01', 'confirmed', NULL, 0, NULL, '2025-11-29 18:11:01'),
    (50, 'NYCDHK', 3, 6, '2025-11-29 22:24:14', 'confirmed', NULL, 0, NULL, '2025-11-29 22:24:14'),
    (51, 'NCH1NX', 4, 6, '2025-11-29 22:26:47', 'confirmed', NULL, 0, NULL, '2025-11-29 22:26:47'),
    (52, 'VBKFB7', 4, 2, '2025-11-29 22:29:26', 'pending', '2025-11-30 15:29:00', 1, 1, '2025-11-29 22:29:26'),
    (53, '68O3HE', 4, 2, '2025-11-29 22:29:55', 'pending', '2025-11-30 15:29:00', 1, 1, '2025-11-29 22:29:55'),
    (54, 'JGC259', 1, 6, '2025-11-30 00:17:39', 'confirmed', NULL, 0, NULL, '2025-11-30 00:17:39');

    -- Reset AUTO_INCREMENT for Order table
    ALTER TABLE `Order` AUTO_INCREMENT = 55;

    -- 8. Insert Order Items
    INSERT INTO OrderItem (order_item_id, order_id, product_id, quantity, unit_price, subtotal, unit_id, quantity_in_base, created_at, updated_at) VALUES
    (34, 46, 2, 8, 82500.00, 660000.00, 4, 8.000000, '2025-11-29 16:52:42', '2025-11-29 16:52:42'),
    (35, 47, 3, 10, 44400.00, 444000.00, 4, 10.000000, '2025-11-29 17:07:25', '2025-11-29 17:07:25'),
    (36, 48, 3, 10, 52000.00, 520000.00, 4, 10.000000, '2025-11-29 17:07:54', '2025-11-29 17:07:54'),
    (37, 49, 3, 10, 100000.00, 1000000.00, 4, 10.000000, '2025-11-29 18:11:01', '2025-11-29 18:11:01'),
    (38, 50, 6, 24, 10000.00, 240000.00, 4, 24.000000, '2025-11-29 22:24:14', '2025-11-29 22:24:14'),
    (39, 51, 7, 1, 5000.00, 5000.00, 1, 1.000000, '2025-11-29 22:26:47', '2025-11-29 22:26:47'),
    (40, 52, 7, 3, 5000.00, 15000.00, 1, 3.000000, '2025-11-29 22:29:26', '2025-11-29 22:29:26'),
    (41, 53, 7, 1, 5000.00, 5000.00, 1, 1.000000, '2025-11-29 22:29:55', '2025-11-29 22:29:55'),
    (42, 54, 4, 30, 4000.00, 120000.00, 5, 30.000000, '2025-11-30 00:17:39', '2025-11-30 00:17:39'),
    (43, 54, 5, 30, 20000.00, 600000.00, 5, 30.000000, '2025-11-30 00:17:39', '2025-11-30 00:17:39'),
    (44, 54, 1, 5, 20000.00, 100000.00, 7, 5.000000, '2025-11-30 00:17:39', '2025-11-30 00:17:39'); 

    -- Reset AUTO_INCREMENT for OrderItem table
    ALTER TABLE OrderItem AUTO_INCREMENT = 45;

    -- 9. Insert Customers
    INSERT INTO Customer (name, phone, email, loyalty_point, tier) VALUES
    ('John Customer', '0901234567', 'john.customer@email.com', 500, 'gold'),
    ('Mary Shopper', '0902345678', 'mary.shopper@email.com', 150, 'silver'),
    ('Bob Buyer', '0903456789', 'bob.buyer@email.com', 50, 'bronze');

   
    -- =====================================================
    -- SCHEDULE MANAGEMENT DATA
    -- =====================================================

    -- 13. Insert Shift Templates (Ca làm việc)
    INSERT INTO ShiftTemplate (name, start_time, end_time, description, is_active) VALUES
    ('Ca Sáng', '06:00:00', '14:00:00', 'Ca làm việc buổi sáng từ 6h đến 14h', TRUE),
    ('Ca Tối', '14:00:00', '22:00:00', 'Ca làm việc buổi tối từ 14h đến 22h', TRUE),
    ('Ca Đêm', '22:00:00', '06:00:00', 'Ca làm việc đêm từ 22h đến 6h sáng hôm sau', TRUE);

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
