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

    -- 2. Insert Categories (with hierarchy)
    INSERT INTO Category (name, parent_id) VALUES
    ('Electronics', NULL),
    ('Clothing', NULL),
    ('Food & Beverage', NULL),
    ('Mobile Phones', 1),
    ('Laptops', 1),
    ('Men Clothing', 2),
    ('Women Clothing', 2);

    -- 3. Insert Suppliers
    INSERT INTO Supplier (name, contact, email, address) VALUES
    ('Tech Supplier Co.', 'John Doe', 'john@techsupplier.com', '100 Supplier Street'),
    ('Fashion Supplier Ltd.', 'Jane Smith', 'jane@fashionsupplier.com', '200 Fashion Avenue'),
    ('Food Supplier Inc.', 'Bob Wilson', 'bob@foodsupplier.com', '300 Food Boulevard');

    -- Note: includes phone column
    INSERT INTO User (username, password, role, store_id, email, phone, status) VALUES
    ('ceo_admin', '123', 'CEO', NULL, 'ceo@ccms.com', '0900000001', 'active'),
    ('manager_store1', '123', 'Store_Manager', 1, 'manager1@ccms.com', '0900000002', 'active'),
    ('cashier_store1_1', '123', 'Cashier', 1, 'cashier1@ccms.com', '0900000003', 'active'),
    ('cashier_store1_2', '123', 'Cashier', 1, 'cashier2@ccms.com', '0900000004', 'active'),
    ('cashier_store1_3', '123', 'Cashier', 1, 'cashier3@ccms.com', '0900000005', 'active'),
    ('warehouse_staff1', '123', 'Warehouse', NULL, 'warehouse1@ccms.com', '0900000006', 'active'),
    ('supplier_rep1', '123', 'Supplier', NULL, 'supplier1@ccms.com', '0900000007', 'active');

    -- 5. Insert Products
    INSERT INTO Product (name, sku, category_id, supplier_id, hq_price, description) VALUES
    ('iPhone 15 Pro', 'IPHONE15PRO001', 4, 1, 999.99, 'Latest iPhone model with Pro features'),
    ('Samsung Galaxy S24', 'SAMSUNGS24001', 4, 1, 899.99, 'Flagship Samsung smartphone'),
    ('MacBook Pro 16"', 'MACBOOKPRO16001', 5, 1, 2499.99, 'Professional laptop for creative work'),
    ('T-Shirt Men XL', 'TSHIRTXL001', 6, 2, 19.99, 'Comfortable cotton t-shirt'),
    ('Jeans Women 30', 'JEANSW301', 7, 2, 49.99, 'Classic fit jeans'),
    ('Coffee Beans 1kg', 'COFFEE1KG001', 3, 3, 12.99, 'Premium arabica coffee beans');

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

    -- 7. Insert Promotions
    INSERT INTO Promotion (name, type, start_date, end_date, status) VALUES
    ('Summer Sale 2024', 'percentage', '2024-06-01 00:00:00', '2024-08-31 23:59:59', 'active'),
    ('Black Friday', 'fixed_amount', '2024-11-25 00:00:00', '2024-11-30 23:59:59', 'inactive'),
    ('Buy 2 Get 1 Free', 'buy_x_get_y', '2024-05-01 00:00:00', '2024-12-31 23:59:59', 'active');

    -- 8. Insert Pricing Rules
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

    -- 10. Insert Product-Promotion relationships
    INSERT INTO ProductPromotion (product_id, promotion_id) VALUES
    (4, 1),
    (5, 1),
    (6, 1),
    (1, 2),
    (2, 2),
    (3, 2),
    (4, 3);

    -- 11. Insert PricingRule-Promotion relationships
    INSERT INTO PricingRulePromotion (rule_id, promotion_id) VALUES
    (4, 1);

    -- 12. Insert Orders (Purchase Orders from Suppliers)
    INSERT INTO `Order` (store_id, supplier_id, created_by, status, expected_delivery) VALUES
    (1, 1, 2, 'confirmed', '2024-12-20 10:00:00'),
    (1, 2, 2, 'pending', '2024-12-25 14:00:00'),
    (1, 3, 2, 'delivered', '2024-12-15 09:00:00');

    -- 13. Insert Order Items
    INSERT INTO OrderItem (order_id, product_id, quantity, unit_price, subtotal) VALUES
    (1, 1, 10, 999.99, 9999.90),
    (1, 2, 5, 899.99, 4499.95),
    (2, 4, 50, 19.99, 999.50),
    (2, 5, 30, 49.99, 1499.70),
    (3, 6, 100, 12.99, 1299.00);

    -- 14. Insert Payments
    INSERT INTO Payment (method, amount, status, paid_at) VALUES
    ('card', 1099.98, 'completed', '2024-12-10 15:30:00'),
    ('cash', 599.97, 'completed', '2024-12-11 10:15:00'),
    ('mobile_payment', 2499.99, 'completed', '2024-12-12 14:45:00'),
    ('card', 129.90, 'completed', '2024-12-13 16:20:00');

    -- 15. Insert Transactions (Sales)
    INSERT INTO Transaction (order_id, customer_id, payment_id, store_id, total_amount, status) VALUES
    (NULL, 1, 1, 1, 1099.98, 'completed'),
    (NULL, 2, 2, 1, 599.97, 'completed'),
    (NULL, 1, 3, 1, 2499.99, 'completed'),
    (NULL, 3, 4, 1, 129.90, 'completed');

    -- 16. Insert Transaction Items
    INSERT INTO TransactionItem (transaction_id, product_id, quantity, unit_price, subtotal) VALUES
    (1, 1, 1, 1099.98, 1099.98),
    (2, 2, 1, 599.97, 599.97),
    (3, 3, 1, 2499.99, 2499.99),
    (4, 4, 5, 25.98, 129.90),
    (4, 5, 1, 49.99, 49.99);

    -- =====================================================
    -- SCHEDULE MANAGEMENT DATA
    -- =====================================================

    -- 17. Insert Shift Templates (Ca làm việc)
    INSERT INTO ShiftTemplate (name, start_time, end_time, description, is_active) VALUES
    ('Ca Sáng', '06:00:00', '14:00:00', 'Ca làm việc buổi sáng từ 6h đến 14h', TRUE),
    ('Ca Tối', '14:00:00', '22:00:00', 'Ca làm việc buổi tối từ 14h đến 22h', TRUE),
    ('Ca Đêm', '22:00:00', '06:00:00', 'Ca làm việc đêm từ 22h đến 6h sáng hôm sau', TRUE),
    ('Ca Part-time Sáng', '08:00:00', '12:00:00', 'Ca part-time buổi sáng', TRUE);

    -- 18. Insert Schedules (Phân công lịch làm việc)
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

    -- 19. Insert Shift Change Requests (Yêu cầu đổi ca)
    INSERT INTO ShiftChangeRequest (store_id, from_schedule_id, from_user_id, to_user_id, to_schedule_id, to_work_date, to_shift_template_id, request_type, reason, status, reviewed_by, reviewed_at) VALUES
    -- Yêu cầu đổi ca đã được duyệt (swap với schedule có sẵn)
    (1, 5, 4, 3, 6, NULL, NULL, 'swap', 'Có việc đột xuất vào buổi sáng thứ tư', 'approved', 2, '2024-12-15 10:30:00'),
    -- Yêu cầu đổi ca đang chờ duyệt (give away - để quản lý tự phân công)
    (1, 14, 4, NULL, NULL, NULL, NULL, 'give_away', 'Không thể làm ca tối chủ nhật', 'pending', NULL, NULL),
    -- Yêu cầu đổi ca bị từ chối (swap với schedule có sẵn)
    (1, 12, 5, 3, 8, NULL, NULL, 'swap', 'Muốn đổi ca để đi chơi', 'rejected', 2, '2024-12-15 14:20:00'),
    -- Yêu cầu đổi ca với ca trống (swap với ca trống - ví dụ)
    (1, 3, 3, NULL, NULL, '2024-12-25', 2, 'swap', 'Muốn đổi sang ca tối ngày 25/12', 'pending', NULL, NULL);

    -- 20. Insert Voucher Templates
    INSERT INTO VoucherTemplate (voucher_code_prefix, voucher_name, discount_type, discount_value, min_purchase_amount, max_discount_amount, required_loyalty_points, validity_days, is_active) VALUES
    ('WELCOME', 'Voucher chào mừng khách hàng mới', 'percentage', 5.00, 0, 50000, 0, 30, true),
    ('LOYAL50', 'Voucher khách hàng thân thiết 50 điểm', 'percentage', 10.00, 100000, 100000, 50, 30, true),
    ('LOYAL100', 'Voucher khách hàng thân thiết 100 điểm', 'percentage', 15.00, 200000, 150000, 100, 30, true),
    ('LOYAL200', 'Voucher khách hàng VIP 200 điểm', 'percentage', 20.00, 300000, 200000, 200, 30, true),
    ('FIXED50K', 'Voucher giảm 50K', 'fixed_amount', 50000, 200000, NULL, 100, 30, true),
    ('FIXED100K', 'Voucher giảm 100K', 'fixed_amount', 100000, 500000, NULL, 200, 30, true);

